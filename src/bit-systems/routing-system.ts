import { Mesh, Object3D, Vector2, Vector3, WebGLRenderTarget } from "three";
import { avatarDirection, avatarIgnoreYDirection, avatarPos, virtualAgent } from "./agent-system";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { ArrayVec2, renderAsEntity } from "../utils/jsx-entity";
import { removeEntity } from "bitecs";
import { NavigationCues } from "../prefabs/nav-line";
import { HubsWorld } from "../app";
import { degToRad } from "three/src/math/MathUtils";
import { AElement } from "aframe";
import { position } from "html2canvas/dist/types/css/property-descriptors/position";
import { element, node } from "prop-types";

let moveHeadCounter = 0;
//------------------------------ interfaces ----------------------------------//
interface RoomObjectDetails {
  angle: Array<number>;
  distance: Array<number>;
  visible: Array<boolean>;
}
export interface Navigation {
  path: Vector3[];
  instructions: Array<Record<string, any>>;
  knowledge: string;
  valid: boolean;
}

export interface DatasetInfo {
  index: number;
  angle: number;
  destination: string;
  instructions: string;
}

export interface NavigationProperties {
  targets: { name: string; position: number[] }[];
  dimensions: [number, number, number, number];
  polygon: number[][];
  obstacles: number[][][];
  objects: { name: string; position: number[]; size: ArrayVec2 }[];
}

export interface DatasetNavItem {
  destination: string;
  filename: string;
  instructions: string;
}

interface RoomObject {
  name: string;
  position: Vector3;
  size?: ArrayVec2;
}

//------------------------------ constansts ----------------------------------//
const step = 0.5;
const headRotationInterval = 20;
//console.log(step);
const outsidePoint = new Vector2(15.7, 68.7);
const INF = Number.MAX_SAFE_INTEGER;

//------------------------------ functions ----------------------------------//

function SegToPointDist(point: Vector2, a: Vector2, b: Vector2): [number, number] {
  const ab = b.clone().sub(a);
  const ap = point.clone().sub(a);
  const proj = ap.dot(ab);
  const abLengthSq = ab.lengthSq();
  const d = proj / abLengthSq;

  let distance;

  if (a.manhattanDistanceTo(point) === 0) return [0, 0];
  if (b.manhattanDistanceTo(point) === 0) return [1, 0];

  if (d <= 0) {
    distance = point.distanceTo(a);
  } else if (d >= 1) {
    distance = point.distanceTo(b);
  } else {
    const cp = a.clone().add(ab.clone().multiplyScalar(d));
    distance = point.distanceTo(cp);
  }

  return [d, distance];
}

function GetVector2(vector: Vector3) {
  return new Vector2(vector.x, vector.z);
}

function GetSingedAngle(vector1: Vector3, vector2: Vector3) {
  const crossVector = new THREE.Vector3();
  crossVector.crossVectors(vector1, vector2).normalize();
  const angle = THREE.MathUtils.radToDeg(vector1.angleTo(vector2));
  const signedAngle = angle * (crossVector.dot(new THREE.Vector3(0, 1, 0)) < 0 ? -1 : 1);
  return signedAngle;
}

function AreNodesAdjacent(node1: Node, node2: Node) {
  if (node1.IsIdentical(node2)) return false;
  return (
    node1.y === node2.y && (node1.x === node2.x || node1.z === node2.z) && node1.vector.distanceTo(node2.vector) <= step
  );
}

function RenderNode(node: Node, color: number): Mesh {
  const sphereGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
  let mat: THREE.MeshBasicMaterial;
  if (node.corridorMember) mat = new THREE.MeshBasicMaterial({ color: 0xc2a17d });
  else if (node.corner) mat = new THREE.MeshBasicMaterial({ color: 0x41368a });
  else mat = new THREE.MeshBasicMaterial({ color: color });
  const sphereMesh = new THREE.Mesh(sphereGeometry, mat);

  APP.world.scene.add(sphereMesh);
  sphereMesh.position.set(node.x, node.y, node.z);
  return sphereMesh;
}

function RenderVector(vector: Vector3, color: number): Mesh {
  const sphereGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
  let mat: THREE.MeshBasicMaterial;
  mat = new THREE.MeshBasicMaterial({ color: color });
  const sphereMesh = new THREE.Mesh(sphereGeometry, mat);

  APP.world.scene.add(sphereMesh);
  sphereMesh.position.set(vector.x, vector.y, vector.z);
  return sphereMesh;
}

function RenderNodes(nodes: Array<Node>, color: number) {
  nodes.forEach(node => {
    RenderNode(node, color);
  });
}

function AreIntersecting(p1: Vector2, p3: Vector2, p4: Vector2, p2: Vector2) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (d === 0) return false;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = (((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d) * -1;

  return t >= 0 && u >= 0 && t <= 1 && u <= 1;
}

function IsPointInside(point: Vector2, vertices: Array<Vector2>, step: number, cornersInside = true) {
  const verticeArray = [...vertices];

  if (
    verticeArray[0].x !== verticeArray[verticeArray.length - 1].x ||
    verticeArray[0].y !== verticeArray[verticeArray.length - 1].y
  )
    verticeArray.push(new Vector2().copy(verticeArray[0]));

  let intersections = 0;
  for (let i = 0; i < verticeArray.length - 1; i++) {
    const [per, segtod] = SegToPointDist(point, verticeArray[i], verticeArray[i + 1]);
    const boundry = per > 0 && per < 1 ? step / 2 : (step / 2) * Math.sqrt(2);
    if (segtod <= boundry) return cornersInside;

    if (AreIntersecting(point, verticeArray[i], verticeArray[i + 1], outsidePoint)) intersections++;
  }
  const isInside = intersections % 2 === 1;

  return isInside;
}

function CrossingTimes(point: Vector2, vertices: Array<Vector2>, externalPoint: Vector2 = outsidePoint) {
  const verticeArray = [...vertices];

  if (
    verticeArray[0].x !== verticeArray[verticeArray.length - 1].x ||
    verticeArray[0].y !== verticeArray[verticeArray.length - 1].y
  )
    verticeArray.push(new Vector2().copy(verticeArray[0]));

  let crosstimes = 0;
  for (let j = 0; j < verticeArray.length - 1; j++)
    if (AreIntersecting(point, verticeArray[j], verticeArray[j + 1], externalPoint)) crosstimes++;

  return crosstimes;
}

function GetClosestIndex(position: Vector3, positionArray: Vector3[]) {
  let max = INF;
  let index = -1;
  for (let i = 0; i < positionArray.length; i++) {
    const distance = positionArray[i].manhattanDistanceTo(position);
    if (distance < max) {
      max = distance;
      index = i;
    }
  }

  return index;
}
function GetClosestVisibleIndex(position: Vector3, positionArray: Vector3[], room: Vector2[], lineDirection: Vector3) {
  let max = INF;
  let index = -1;
  for (let i = 0; i < positionArray.length; i++) {
    const distance = positionArray[i].manhattanDistanceTo(position);
    if (distance < max) {
      const angle = GetSingedAngle(lineDirection, positionArray[i].clone().sub(position.clone()).normalize());
      const isVisibleFromNode =
        CrossingTimes(GetVector2(position), room, GetVector2(positionArray[i])) === 0 &&
        (distance <= 5 || Math.abs(angle) < 75);

      if (isVisibleFromNode) {
        max = distance;
        index = i;
      }
    }
  }
  return index;
}
function GetClosestDirectIndex(position: Vector3, positionArray: Vector3[], room: Vector2[]) {
  let max = INF;
  let index = -1;
  for (let i = 0; i < positionArray.length; i++) {
    const distance = positionArray[i].manhattanDistanceTo(position);
    if (distance < max) {
      const isVisibleFromNode = CrossingTimes(GetVector2(position), room, GetVector2(positionArray[i])) === 0;

      if (isVisibleFromNode) {
        max = distance;
        index = i;
      }
    }
  }
  return index;
}

function Orient(vector1: Vector3, vector2: Vector3): { action: string; direction: string; angle: number } {
  let stairs = false;
  let action: "turn" | "stairs" | "continue" = "turn";
  let direction: "down" | "around" | "left" | "right" | "up" | "down" | "forward";

  const crossVector = new THREE.Vector3();
  crossVector.crossVectors(vector1, vector2).normalize();

  if (vector1.y !== 0) vector1.y = 0;
  if (vector2.y !== 0) {
    action = "stairs";
    if (vector2.y > 0) direction = "up";
    else direction = "down";
    vector2.y = 0;
    stairs = true;
  }

  const angle = THREE.MathUtils.radToDeg(vector1.angleTo(vector2));
  const signedAngle = angle * (crossVector.dot(new THREE.Vector3(0, 1, 0)) < 0 ? -1 : 1);

  if (!stairs) {
    if (angle > 90) direction = "around";
    else if (signedAngle > 10) direction = "left";
    else if (signedAngle < -10) direction = "right";
    else {
      action = "continue";
      direction = "forward";
    }
  }
  return { action: action, direction: direction!, angle: Math.floor(signedAngle) };
}

//------------------------------ classes ----------------------------------//

export class Node {
  vector: Vector3;
  vector2: Vector2;
  visited: boolean;
  path: Array<number>;
  distances: Array<number>;
  x: number;
  y: number;
  z: number;
  neighboors: Record<number, number>;
  corridorMember: boolean;
  targetNode: string | null;
  corner: boolean;

  constructor(x: number, y: number, z: number) {
    this.vector = new THREE.Vector3(x, y, z);
    this.vector2 = new Vector2(x, z);
    this.visited = false;
    this.path = [];

    this.neighboors = {};
    this.x = this.vector.x;
    this.y = this.vector.y;
    this.z = this.vector.z;
    this.corridorMember = false;
    this.corner = false;
    this.targetNode = null;
  }

  MakeStartingPoint(nodeCount: number, index: number) {
    this.distances = new Array(nodeCount).fill(INF);
    this.distances[index] = 0;
    this.path.push(index);
  }

  Visit() {
    this.visited = true;
  }

  Reset() {
    this.visited = false;
    this.path = [];
  }

  IsIdentical(node: Node) {
    return node.x === this.x && node.y === this.x && node.z === this.z;
  }
}

export class NavigationSystem {
  allowed: boolean;
  nodes: Array<Node>;
  weights: Array<Array<number>>;
  targetName: Record<string, number>;
  objects: Array<RoomObject>;
  targetNodes: Record<string, Array<number>>;
  grid: Array<Array<number>>;
  roomDimensions: [number, number, number, number];
  obstacles: Array<Array<Vector2>>;
  nodeCount: number | null;
  mapped: boolean;
  mappedNodes: Array<boolean>;
  paths: Array<Array<Array<number>>>;
  dest: { active: boolean; pos?: Node; time?: Date };
  navProps: NavigationProperties;
  cuesEid: number;
  roomPolygon: Vector2[];
  cuesObj: Object3D;
  activeDest: boolean;
  nodeObjs: Array<Mesh>;
  snapCalledTimes: number;
  height: number;

  constructor() {
    this.allowed = false;
    this.nodes = [];
    this.targetName = {};
    this.targetNodes = {};
    this.nodeCount = null;
    this.mapped = false;
    this.dest = { active: false };
    this.objects = [];
    this.height = 0;
  }

  SnapPOV(nodeNo: number, angleNo: number) {
    console.log(window.innerWidth);
    const renderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight);
    APP.scene?.renderer.setRenderTarget(renderTarget);
    APP.scene?.renderer.render(APP.scene!.object3D, APP.scene!.camera);
    const canvas = APP.scene!.renderer.domElement;
    APP.scene?.renderer.setRenderTarget(null);

    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `image_${nodeNo}_${angleNo * 20}.png`;
    link.click();
  }

  waitForSeconds(secs: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(null);
      }, secs * 1000);
    });
  }

  async snapAnglesInNode(i: number) {
    const node = this.nodes[i];
    var j = 0;
    while (j < 360) {
      APP.scene!.emit("clear-scene");
      var avatarRig = (document.querySelector("#avatar-rig")! as AElement).object3D;
      var avatarHeight = avatarRig.position.y;
      var nodeVec = node.vector.clone();
      avatarRig.position.set(nodeVec.x, avatarHeight, nodeVec.z);

      avatarRig.rotation.set(0, degToRad(j), 0);
      avatarRig.updateMatrix();

      await this.waitForSeconds(5);
      this.SnapPOV(i, j);

      j += 20;
      //console.log(j);
    }
  }

  calculateCorridors(grid: number[][], direction: "vertical" | "horizontal") {
    const isVertical = direction === "vertical";
    const lineCount = grid.length;
    const rowCount = grid[0].length;

    const getPoint = (outerIndex: number, innerIndex: number) =>
      isVertical ? grid[outerIndex][innerIndex] : grid[innerIndex][outerIndex];

    const isPoint = (point: number) => point >= 0;
    const setCorridorMember = (point: number) => (this.nodes[point].corridorMember = true);
    const isCorridorMember = (point: number) => isPoint(point) && this.nodes[point].corridorMember;

    for (let outerIndex = 0; outerIndex < (isVertical ? lineCount : rowCount); outerIndex++) {
      const points = []; //even index is startPoint odd is endPoint

      for (let innerIndex = 0; innerIndex < (isVertical ? rowCount : lineCount); innerIndex++) {
        const point = getPoint(outerIndex, innerIndex);

        if (isCorridorMember(point)) continue;

        const startingPoint = points.length % 2 === 0;
        const lastPoint = points.length % 2 === 1 && innerIndex === (isVertical ? rowCount : lineCount) - 1;

        if (isPoint(point) && (startingPoint || lastPoint)) points.push(innerIndex);
        else if (!isPoint(point) && points.length % 2 === 1) points.push(innerIndex - 1);
      }

      for (let k = 0; k < points.length; k += 2) {
        let startPoint = points[k];
        let endPoint = points[k + 1];

        let stopOuterIndex = outerIndex;

        for (let i = outerIndex + 1; i < (isVertical ? lineCount : rowCount); i++) {
          const startingBorder = startPoint === 0 ? true : !isPoint(getPoint(i, startPoint - 1));
          const endingBorder =
            endPoint === (isVertical ? rowCount : lineCount) - 1 ? true : !isPoint(getPoint(i, endPoint + 1));

          let pointCount = 0;
          for (let j = startPoint; j <= endPoint; j++) if (isPoint(getPoint(i, j))) pointCount += 1;
          const allPointsExist = pointCount >= endPoint - startPoint + 1;

          const bordersOk = startingBorder && endingBorder && allPointsExist;
          if (bordersOk) stopOuterIndex = i;
          else break;
        }

        // if (!isVertical)
        //// console.log(
        //     `for corridor: [${startPoint}, ${endPoint}] start index is: ${outerIndex} and stop index is: ${stopOuterIndex}`
        //   );

        const length = stopOuterIndex - outerIndex + 1;
        const width = endPoint - startPoint + 1;

        if (16 * width <= 9 * length) {
          for (let i = outerIndex; i <= stopOuterIndex; i++) {
            for (let j = points[k]; j <= points[k + 1]; j++) setCorridorMember(getPoint(i, j));
          }
        }
      }
    }
  }

  findCorners(grid: number[][]) {
    for (let i = 0; i < grid.length; i++) {
      const gridLine = grid[i];
      for (let j = 0; j < gridLine.length; j++) {
        if (gridLine[j] < 0) continue;
        const point = this.nodes[gridLine[j]];
        //if (!point) console.log(i, gridLine);
        if (point.corridorMember) continue;
        let corridorCount = 0;
        let cornerCount = 0;
        for (let key in point.neighboors) {
          if (this.nodes[parseInt(key)].corridorMember) corridorCount++;
          if (this.nodes[parseInt(key)].corner) cornerCount++;
        }

        if (corridorCount > 1 || cornerCount > 0) point.corner = true;
      }
    }
  }

  CalculateGrid(
    obstacleArray: { array: Vector2[]; inside: boolean; edgeThreshold: number }[],
    ignoreBlanks: boolean,
    grid: number[][] = []
  ) {
    let xCount = -1;
    let zCount = -1;

    //console.log(grid.map(grid => grid.length).toString());

    if (grid.length === 0) {
      grid = new Array(this.roomDimensions[1] / step + 1);
      for (let i = 0; i < grid.length; i++) grid[i] = new Array(this.roomDimensions[3] / step + 1).fill(-1);
    }

    //console.log(grid.map(grid => grid.length).toString());
    this.nodes = [];

    for (let x = this.roomDimensions[0]; x < this.roomDimensions[1]; x += step) {
      xCount++;
      zCount = 0;

      for (let z = this.roomDimensions[2]; z < this.roomDimensions[3]; z += step) {
        zCount++;

        if (ignoreBlanks) if (grid[xCount][zCount] < 0) continue;
        let keep = true;

        const point = new Vector2(x, z);

        for (let n = 0; n < obstacleArray.length; n++) {
          const obstacle = obstacleArray[n];

          if (IsPointInside(point, obstacle.array, obstacle.edgeThreshold, !obstacle.inside) !== obstacle.inside) {
            keep = false;
            break;
          }
        }

        if (keep) {
          const newIndex = this.nodes.push(new Node(point.x, 0, point.y)) - 1;
          grid[xCount][zCount] = newIndex;
        }
      }
    }

    //console.log(grid.map(grid => grid.length).toString());
    return grid;
  }

  RecalculateGrid(obstacleArray: { array: Vector2[]; inside: boolean; edgeThreshold: number }[], grid: number[][]) {
    let xCount = -1;
    let zCount = -1;

    for (let x = this.roomDimensions[0]; x < this.roomDimensions[1]; x += step) {
      xCount++;
      zCount = 0;

      for (let z = this.roomDimensions[2]; z < this.roomDimensions[3]; z += step) {
        zCount++;

        if (grid[xCount][zCount] < 0) continue;

        const point = new Vector2(x, z);
        for (let n = 0; n < obstacleArray.length; n++) {
          const obstacle = obstacleArray[n];

          if (IsPointInside(point, obstacle.array, obstacle.edgeThreshold, !obstacle.inside) !== obstacle.inside) {
            const removedIndex = grid[xCount][zCount];

            const a = this.nodes.length;
            this.nodes.splice(removedIndex, 1);
            const b = this.nodes.length;

            //console.log(a, b);

            for (let i = 0; i < grid.length; i++) {
              for (let j = 0; j < grid[i].length; j++) {
                const value = grid[i][j];
                if (value < 0) continue;

                if (grid[i][j] > removedIndex) grid[i][j] -= 1;
                else if (grid[i][j] === removedIndex) grid[i][j] = -1;
              }
            }
          }
        }
      }
    }

    return grid;
  }

  async Init() {
    this.allowed = roomPropertiesReader.AllowsNav;

    if (!this.allowed) {
      console.warn("Navigation is not allowed for this room");
      return;
    }

    const filename = roomPropertiesReader.roomProps.navigations[0].filename;

    const response = await fetch(`${roomPropertiesReader.serverURL}/file/${filename}`, { method: "GET" });
    if (!response.ok) throw new Error("Response not OK");
    const responseProperties = (await response.json()) as NavigationProperties;

    this.navProps = responseProperties;
    this.nodes = [];
    this.targetName = {};
    this.roomPolygon = [];

    const navObstacles: Vector2[][] = [];
    const vlObstacles: Vector2[][] = [];

    try {
      if (!this.navProps.dimensions.length || !this.navProps.polygon.length || !this.navProps.targets.length)
        throw new Error("Could not read nav props");

      // get values
      this.obstacles = this.navProps.obstacles.map(obstacle => obstacle.map(point => new Vector2(point[0], point[1])));
      this.roomDimensions = this.navProps.dimensions!;
      this.navProps.obstacles!.forEach(obstacle =>
        navObstacles.push(obstacle.map(obstaclePoint => new Vector2(obstaclePoint[0], obstaclePoint[1])))
      );
      this.roomPolygon = this.navProps.polygon!.map(point => new Vector2(point[0], point[1]));
      this.objects = this.navProps.objects.map(object => {
        return {
          name: object.name,
          position: new Vector3(object.position[0], 0, object.position[1]),
          size: object.size
        };
      });

      // this.objects.forEach(obj => RenderVector(obj.position, 0x41368a));

      for (let i = 0; i < this.navProps.objects.length; i++) {
        const object = this.navProps.objects[i];
        if (!object.size) continue;
        const xOffset = object.size[0] / 2;
        const zOffset = object.size[1] / 2;
        const center = object.position;
        const lu = new Vector2(center[0] - xOffset, center[1] + zOffset);
        const ru = new Vector2(center[0] + xOffset, center[1] + zOffset);
        const rd = new Vector2(center[0] + xOffset, center[1] - zOffset);
        const ld = new Vector2(center[0] - xOffset, center[1] - zOffset);
        vlObstacles.push([lu, ru, rd, ld]);
      }
    } catch (e) {
      this.allowed = false;
      console.error(e);
      return;
    }

    const objectArray = [
      ...this.obstacles.map(obstacle => {
        return { array: obstacle, inside: false, edgeThreshold: step * 2 };
      }),
      { array: this.roomPolygon, inside: true, edgeThreshold: step * 2 }
    ];

    //console.log(`obstacles`, this.obstacles);

    let grid = this.CalculateGrid(objectArray, false);

    this.calculateCorridors(grid, "vertical");
    this.calculateCorridors(grid, "horizontal");

    const newObstParams = vlObstacles.map(obst => {
      return { array: obst, inside: false, edgeThreshold: step / 2 };
    });

    //console.log(newObstParams);

    grid = this.RecalculateGrid(newObstParams, grid);

    this.navProps.targets.forEach(target => {
      const targetPos = target.position;
      const targetNode = new Node(targetPos[0], 0, targetPos[1]);
      const closestIndices = this.GetClosestIndices(targetNode.vector);
      this.targetNodes[target.name] = closestIndices;
      this.targetName[target.name] = closestIndices[0];
      this.nodes[closestIndices[0]].targetNode = target.name;
    });

    //console.log(this.objects);
    // roomObjects.forEach(object =>
    //   this.objects.push({
    //     name: object.name,
    //     position: new Vector3(object.position[0], 0, object.position[1])
    //   })
    // );

    const targetNodeArray = Object.values(this.targetName).map(index => this.nodes[index]);

    this.weights = new Array(this.nodes.length);
    for (let i = 0; i < this.nodes.length; i++) this.weights[i] = new Array(this.nodes.length).fill(-1);

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        if (AreNodesAdjacent(this.nodes[i], this.nodes[j])) {
          const distance = this.nodes[i].vector.manhattanDistanceTo(this.nodes[j].vector);

          if (distance > 0) {
            this.weights[i][j] = distance;
            this.weights[j][i] = distance;
            this.nodes[i].neighboors[j] = distance;
            this.nodes[j].neighboors[i] = distance;
          }
        }
      }
    }

    this.nodes.forEach(node => {
      let count = 0;
      Object.keys(node.neighboors).forEach(_ => {
        count++;
      });
      if (count === 0) {
        console.error(node.x, node.z);
      }
    });

    this.nodeCount = this.nodes.length;
    this.mapped = false;
    this.mappedNodes = new Array(this.nodeCount).fill(false);
    this.paths = new Array(this.nodeCount);
    for (let j = 0; j < this.nodeCount; j++) this.paths[j] = [];

    this.findCorners(grid);
    // RenderNodes(this.nodes, 0xfffff);
  }

  GetDestIndex(salientName: string): number {
    //// console.log(salientName);
    const lowerCaseKey = salientName.toLowerCase();
    for (const [k, v] of Object.entries(this.targetName)) {
      if (k.toLowerCase() === lowerCaseKey) {
        return v;
      }
    }
    return -1;
  }

  Dijkstra(startIndex: number, startPos: Vector3) {
    if (startIndex < 0 || startIndex > this.nodeCount! - 1) throw new Error("Invalid starting index");
    if (this.mapped) this.Reset();

    let prevNodeIndex = -1;
    let startingNode = this.nodes[startIndex];
    startingNode.MakeStartingPoint(this.nodeCount!, startIndex);

    for (let i = 0; i < this.nodeCount! - 1; i++) {
      let minDistanceIndex: number;
      if (i === 1)
        minDistanceIndex = this.GetDirAwareMinDistanceIndex(
          startingNode.distances,
          startPos,
          this.nodes[startIndex].vector
        );
      else minDistanceIndex = this.GetMinDistanceIndex(startingNode.distances);
      this.nodes[minDistanceIndex].Visit();

      for (let j = 0; j < this.nodeCount!; j++) {
        if (!this.nodes[j].visited && this.nodes[j].neighboors[minDistanceIndex]) {
          let totalDistance = startingNode!.distances[minDistanceIndex] + this.nodes[j].neighboors[minDistanceIndex];
          let nodePath: Array<number> = this.nodes[minDistanceIndex].path;

          let prevVec, curVec, nextVec: Vector3;

          if (nodePath.length > 1) {
            prevVec = this.nodes[nodePath[nodePath.length - 2]].vector.clone();
            curVec = this.nodes[minDistanceIndex].vector.clone();
            nextVec = this.nodes[j].vector.clone();
            prevVec.setY(curVec.y);
          } else {
            prevVec = startPos.clone().setY(this.height);
            curVec = this.nodes[minDistanceIndex].vector.clone();
            nextVec = this.nodes[j].vector.clone();
            prevVec.setY(curVec.y);
          }

          const ax = curVec.clone().sub(prevVec.clone()).normalize();
          const xb = nextVec.clone().sub(curVec.clone()).normalize();
          const cross = xb.cross(ax);

          totalDistance += cross.length();

          if (totalDistance < startingNode.distances[j]) {
            startingNode.distances[j] = totalDistance;
            this.nodes[j].path = [...this.nodes[minDistanceIndex].path, j];
          }
        }
        this.paths[startIndex][j] = this.nodes[j].path;
      }

      prevNodeIndex = minDistanceIndex;
    }

    this.mapped = true;
    this.mappedNodes[startIndex] = true;
  }

  GetDirAwareMinDistanceIndex(distances: Array<number>, prevPoint: Vector3, curPoint: Vector3) {
    let minDistance = INF;
    let minDistanceIndex = -1;

    const ax = curPoint.clone().setY(this.height).sub(prevPoint.clone().setY(this.height)).normalize();

    for (let i = 0; i < this.nodeCount!; i++) {
      let nodeDistance = distances[i];
      const xb = this.nodes[i].vector.clone().sub(curPoint.clone()).normalize();
      const cross = xb.cross(ax);

      nodeDistance += cross.length();

      if (!this.nodes[i].visited && nodeDistance < minDistance) {
        minDistance = distances[i];
        minDistanceIndex = i;
      }
    }
    return minDistanceIndex;
  }
  GetMinDistanceIndex(distances: Array<number>) {
    let minDistance = INF;
    let minDistanceIndex = -1;

    for (let i = 0; i < this.nodeCount!; i++) {
      let nodeDistance = distances[i];

      if (!this.nodes[i].visited && nodeDistance < minDistance) {
        minDistance = distances[i];
        minDistanceIndex = i;
      }
    }
    return minDistanceIndex;
  }

  GetInstructionsString(path: Array<number>, playerForward: Vector3, destination: string): string {
    // ------------------- get line object ------------------- //
    const nodeLines: Node[][] = []; // each element represent the line. each element has all nodes of the line
    const instructions: string[] = [];
    const turnArray: ("turn right" | "turn left" | "turn around" | "go forward")[] = []; // this element has all sequencial turns

    const allObjects = [
      ...this.objects,
      ...Object.keys(this.targetName).map(key => ({
        name: key,
        position: this.nodes[this.targetName[key]].vector
      }))
    ];

    const allObjectPositions = allObjects.map(obj => obj.position);

    let nodeLineArray: Array<Node> = [];
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = this.nodes[path[i]];
      const current = currentNode.vector;
      const next = this.nodes[path[i + 1]].vector;

      const nextLine = next.clone().sub(current);
      const prevLine = i === 0 ? playerForward.clone() : current.clone().sub(this.nodes[path[i - 1]].vector);

      const angle = GetSingedAngle(prevLine, nextLine);
      nodeLineArray.push(currentNode);

      if (i === 0 || angle !== 0) {
        if (Math.abs(angle) > 110) turnArray.push("turn around");
        else if (Math.abs(angle) <= 20) turnArray.push("go forward");
        else if (angle < 0) turnArray.push("turn right");
        else turnArray.push("turn left");
        if (i !== 0) {
          nodeLines.push(nodeLineArray);
          nodeLineArray = [currentNode];
        }
      }
    }

    nodeLines.push(nodeLineArray);
    const vectorLines = nodeLines.map(innerLine => innerLine.map(node => node.vector));
    const allCrossingIndexes: number[] = [];
    const arrivingIndexes: number[] = [];

    for (let lineIndex = 0; lineIndex < vectorLines.length; lineIndex++) {
      const line = vectorLines[lineIndex];
      const lineDirection = line[line.length - 1].clone().sub(line[0]).normalize();

      const closestLineItemIndices = line.map((point, index) => {
        return index === line.length - 1
          ? GetClosestVisibleIndex(point, allObjectPositions, this.roomPolygon, lineDirection)
          : GetClosestDirectIndex(point, allObjectPositions, this.roomPolygon);
      });

      const crossingIndexes: number[] = [];
      const crossingAngles: number[] = [];

      let inCorridor = nodeLines[lineIndex].some(node => node.corridorMember);
      let inCorner = nodeLines[lineIndex][line.length - 1].corner;
      let location = "";

      const filteredIndices = [...new Set(closestLineItemIndices)].filter(index => index >= 0);

      const lastClosestItem =
        closestLineItemIndices[line.length - 1] >= 0 ? allObjects[closestLineItemIndices[line.length - 1]] : null;

      if (lastClosestItem) {
        location = lastClosestItem.name;
        arrivingIndexes.push(closestLineItemIndices[line.length - 1]);
      }

      for (let ind = 0; ind < filteredIndices.length; ind++) {
        const filteredIndex = filteredIndices[ind];
        if (crossingIndexes.includes(filteredIndex) || arrivingIndexes.includes(filteredIndex)) continue;

        const object = allObjects[filteredIndex].position;
        let visibilityCount = 0;
        let behindCount = 0;
        let prevVisibility = false;
        let prevBehind = false;

        line.forEach(point => {
          const nodeToObj = object.clone().sub(point);
          const angle = GetSingedAngle(lineDirection, nodeToObj.clone().normalize());
          const crossing = CrossingTimes(GetVector2(point), this.roomPolygon, GetVector2(object)) !== 0;

          const isVisible = Math.abs(angle) < 75 && !crossing;
          const isBehind = !isVisible && Math.abs(angle) > 90;

          if (isVisible) visibilityCount = prevVisibility ? visibilityCount + 1 : 1;
          if (isBehind) behindCount = prevBehind ? behindCount + 1 : 1;
          else behindCount = 0;

          prevVisibility = isVisible;
          prevBehind = isBehind;
        });

        if (visibilityCount > 2 && behindCount > 2) {
          allCrossingIndexes.push(filteredIndex);
          crossingIndexes.push(filteredIndex);
          crossingAngles.push(GetSingedAngle(lineDirection, object.clone().sub(line[0])));
        }
      }

      instructions.push(turnArray[lineIndex]);

      const lineDist = line[line.length - 1].clone().sub(line[0].clone()).length();
      if (lineDist >= 5) {
        if (inCorridor) instructions.push("pass corridor");

        crossingIndexes.forEach((objectIndex, angleIndex) => {
          instructions.push(
            `crossing ${allObjects[objectIndex].name} ${crossingAngles[angleIndex] < 0 ? "right" : "left"}`
          );
        });
        let arriving;
        if (inCorner) arriving = "corner";
        else if (location.length > 0) {
          arriving = location;
        } else arriving = "wall";
        instructions.push(`arrive ${arriving}`);
        if (arriving === destination) break;
      } else if (lineIndex === nodeLines.length - 1) {
        if (location.length > 0) instructions.push(`arrive ${location}`);
      }
    }

    const inst = instructions.filter(value => value !== "").join(", ");
    return inst;
  }

  moveHead() {
    const avatarRig = (document.querySelector("#avatar-rig")! as AElement).object3D;
    const avatarPovObj = (document.querySelector("#avatar-pov-node") as AElement).object3D;

    if (moveHeadCounter % 2 === 0) {
      avatarPovObj.rotation.set(degToRad((20 * moveHeadCounter) / 2), avatarPovObj.rotation.y, avatarPovObj.rotation.z);
    } else {
      avatarPovObj.rotation.set(avatarPovObj.rotation.x, avatarPovObj.rotation.y, degToRad((20 * moveHeadCounter) / 2));
    }
    moveHeadCounter++;
    avatarRig.updateMatrix();
  }

  async SnapFromPoint(i: number, j: number) {
    APP.scene!.emit("clear-scene");

    // const avatarRig = (document.querySelector("#avatar-rig")! as AElement).object3D;
    // const avatarHead = (document.querySelector("#avatar-pov-node") as AElement).object3D;
    // const avatarHeight = avatarRig.position.y;

    // avatarRig.rotation.set(0, degToRad(j), 0);
    // const nodeVec = this.nodes[i].vector;
    // avatarRig.position.set(nodeVec.x, avatarHeight, nodeVec.z);
    // avatarRig.updateMatrix();
    await this.waitForSeconds(0.1);

    // this.SnapPOV(i, j);
  }

  MoveToPoint(i: number, j: number) {
    APP.scene!.emit("clear-scene");

    const avatarRig = (document.querySelector("#avatar-rig")! as AElement).object3D;
    const avatarHead = (document.querySelector("#avatar-pov-node") as AElement).object3D;
    const avatarHeight = avatarRig.position.y;
    avatarRig.rotation.set(0, degToRad(j), 0);
    const nodeVec = this.nodes[i].vector;
    avatarRig.position.set(nodeVec.x, avatarHeight, nodeVec.z);
    avatarRig.updateMatrix();
  }

  async CreateVLDataset() {
    const targets = ["conference room", "business room", "social area", "booth 1", "booth 2", "booth 3", "booth 4"];

    const instructions: DatasetInfo[] = new Array(this.nodeCount! * targets.length).fill({});
    console.log(`array initialization`);
    const photoNames: number[] = [];
    const avatarRig = (document.querySelector("#avatar-rig")! as AElement).object3D;
    const avatarHead = (document.querySelector("#avatar-pov-node") as AElement).object3D;
    const avatarHeight = avatarRig.position.y;
    const headRotationSteps = 360 / headRotationInterval;
    APP.scene!.emit("clear-scene");
    let counter = -1;
    const getRandomNumber = (min: number, max: number): number => {
      return degToRad(Math.round(Math.random() * (max - min) + min));
    };

    for (let j = 0; j < headRotationSteps; j++) {
      const headRotation = j * headRotationInterval;
      if (headRotation !== 200 && headRotation !== 80) continue;

      avatarRig.rotation.set(0, degToRad(headRotation), 0);
      counter = -1;

      for (let i = 0; i < this.nodes.length; i++) {
        if ((i === 2326 && headRotation === 200) || (i === 3111 && headRotation === 80)) {
          const node = this.nodes[i];
          const nodeVec = node.vector;
          // if (Object.keys(node.neighboors).length === 0) continue;
          avatarRig.position.set(nodeVec.x, avatarHeight, nodeVec.z);
          avatarRig.updateMatrix();
          avatarHead.rotation.set(getRandomNumber(-15, 15), 0, getRandomNumber(-10, 10));
          avatarHead.updateMatrix();

          try {
            for (const targetName of targets) {
              counter++;
              const instObj = this.GetOnlyInstructionsKnowledege(i, headRotation, targetName);
              instructions[counter] = instObj;
            }
          } catch (e) {
            console.log(`Error at node ${i}, angle ${j}`);
            console.error(e instanceof Error ? e.message : e);
            continue;
          }
          await this.waitForSeconds(0.5);
          this.SnapPOV(i, j);
          // if (j === 0) photoNames.push(i);
          // if ((i + 1) % 100 === 0) console.log(`Processed ${i + 1}/${this.nodes.length} nodes`);}
        }

        // await this.waitForSeconds(10);

        // console.log(`exporting json file for angle: ${headRotation}`);
        // const serializedJSONData = JSON.stringify(instructions);
        // const filename = `instructions_${headRotation}.json`;
        // await this.waitForSeconds(5);
        // await this.downloadFile(filename, serializedJSONData);
        // instructions.length = 0;

        // console.log(`waiting for a bit`);
        // await this.waitForSeconds(10);
        //console.log(`continuing`);

        // for (let j = 270; j < 360; j += 45) {
        //   avatarRig.rotation.set(0, degToRad(j), 0);
        //   avatarRig.updateMatrix();
        //   for (let i = 0; i < photoNames.length; i++) {
        //     const nodeIndex = photoNames[i];
        //     const node = this.nodes[nodeIndex];

        //     var avatarHeight = avatarRig.position.y;
        //     var nodeVec = node.vector.clone();
        //     avatarRig.position.set(nodeVec.x, avatarHeight, nodeVec.z);
        //     avatarRig.updateMatrix();
        //     await this.waitForSeconds(0.005);
        //     this.SnapPOV(nodeIndex, j);
        //   }
        // }
      }
    }
  }

  downloadFile(filename: string, data: string) {
    return new Promise((resolve, reject) => {
      const a = document.createElement("a");
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;

      a.click();
      resolve(null);
    });
  }

  //only for dataset creation purposes
  GetOnlyInstructionsKnowledege(startIndex: number, angle: number, stopName: string): DatasetInfo {
    const stopIndex = this.GetDestIndex(stopName);

    if (!this.mappedNodes[startIndex]) {
      if (this.mapped) this.Reset();
      this.Dijkstra(startIndex, avatarPos());
    }

    const path = this.paths[startIndex][stopIndex];

    const inst = this.GetInstructionsString(path, new Vector3(0, degToRad(angle), 0), stopName);
    return { index: startIndex, angle: angle, destination: stopName, instructions: inst };
  }

  GetInstructions(stopName: string) {
    const startPos = avatarPos().clone();
    this.RemoveCues();
    const startIndex = this.GetClosestIndices(startPos)[0];
    const stopIndex = this.GetDestIndex(stopName);

    if (stopIndex < 0 || !this.allowed) return { path: [], instructions: [], knowledge: "no location", valid: false };

    if (!this.mappedNodes[startIndex]) {
      if (this.mapped) this.Reset();
      this.Dijkstra(startIndex, startPos);
    }

    const path = this.paths[startIndex][stopIndex];
    const pathVectors: Array<Vector3> = [];

    path.forEach(index => {
      pathVectors.push(this.nodes[index].vector);
    });

    const navigation: Navigation = {
      path: pathVectors,
      instructions: [{ action: "start", from: startIndex }],
      knowledge: "",
      valid: false
    };

    const knowledgeArray: Array<Record<string, any>> = [{ action: "start" }];
    const playerForward = avatarIgnoreYDirection();

    let distanceSum = 0;

    // const newKnowledge = this.GetNewInstructions(path, playerForward);
    const instObj = this.GetInstructionsString(path, playerForward, stopName);
    // instObj.destination = stopName;

    for (let i = 0; i < path.length - 1; i++) {
      const current = this.nodes[path[i]].vector;
      const next = this.nodes[path[i + 1]].vector;

      const nextLine = next.clone().sub(current);
      const prevLine = new THREE.Vector3();

      let prev;

      if (i === 0) prevLine.copy(playerForward);
      else {
        prev = this.nodes[path[i - 1]].vector;
        prevLine.copy(current.clone().sub(prev));
      }

      let closestObject;
      let closestObjectIndex = GetClosestIndex(
        current,
        this.objects.map(object => object.position)
      );
      if (closestObjectIndex > 0) closestObject = Object.values(this.objects)[closestObjectIndex];

      const turn = Orient(prevLine.clone().normalize(), nextLine.clone().normalize());
      const extendedTurn = { ...turn, line: nextLine.clone().normalize(), current: current };

      navigation.instructions.push(extendedTurn);

      navigation.instructions.push({
        action: "move",
        from: path[i],
        to: path[i + 1],
        distance: Math.floor(nextLine.length())
      });

      if (turn.action === "turn" || turn.action === "stairs") {
        if (distanceSum !== 0) knowledgeArray.push({ action: "move", distance: distanceSum });
        knowledgeArray.push({ action: turn.action, direction: turn.direction });
        distanceSum = 0;
      }

      distanceSum += Math.floor(nextLine.length());
    }

    navigation.instructions.push({ action: "finish", to: stopIndex });
    knowledgeArray.push({ action: "move", distance: distanceSum }, { action: "finish" });
    navigation.knowledge = knowledgeArray
      .map(actionObj => {
        const { action, direction, distance } = actionObj;
        if (distance) {
          return `${action} ${distance}`;
        } else if (direction) {
          return `${action} ${direction}`;
        } else {
          return `${action}`;
        }
      })
      .join(", ");

    navigation.valid = true;
    navigation.knowledge = instObj;
    this.dest.pos = this.nodes[stopIndex];
    return navigation;
  }

  Reset() {
    this.nodes.forEach(node => {
      node.Reset();
    });
  }

  GetIdenticalNode(node: Node): number {
    let max = INF;
    let index = -1;
    for (let i = 0; i < this.nodes.length; i++) {
      const distance = this.nodes[i].vector.manhattanDistanceTo(node.vector);
      if (distance < max) {
        max = distance;
        index = i;
      }
    }
    return max === 0 ? index : -1;
  }

  GetClosestIndices(position: Vector3): number[] {
    let indices = new Array<number>();
    let max = INF;
    for (let i = 0; i < this.nodes.length; i++) {
      const distance = this.nodes[i].vector.manhattanDistanceTo(position);
      if (distance === max) {
        indices.push(i);
      } else if (distance < max) {
        max = distance;
        indices = [i];
      }
    }
    return indices;
  }
  GetDirAwareClosestIndices(position: Vector3, direction: Vector3): number[] {
    let indices = new Array<number>();
    let max = INF;
    const ax = direction.normalize();
    for (let i = 0; i < this.nodes.length; i++) {
      const distance = this.nodes[i].vector.manhattanDistanceTo(position);

      if (distance < 1) {
        indices.push(i);
      }
    }

    if (indices.length > 0) return indices;

    for (let i = 0; i < this.nodes.length; i++) {
      const distance = this.nodes[i].vector.manhattanDistanceTo(position);

      if (distance === max) {
        indices.push(i);
      } else if (distance < max) {
        max = distance;
        indices = [i];
      }
    }

    // max = INF;

    // const weights = indices.map(index => {
    //   const xb = this.nodes[index].vector.clone().sub(position.clone()).normalize();
    //   const cross = xb.cross(ax);
    //   const yAxis = new Vector3(0, 1, 0);
    //   const sign = yAxis.dot(cross) >= 0 ? 0 : 0.5;
    //   const distance = cross.length() + sign;
    //   return distance;
    // });
    // for (let i = 0; i < indices.length; i++) {
    //   if (distance === max) {
    //     indices.push(i);
    //   } else if (distance < max) {
    //     max = distance;
    //     indices = [i];
    //   }
    // }

    return indices;
  }

  GetNodeIndexByPosition(position: Vector3) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (position === this.nodes[i].vector) return i;
    }
    return -1;
  }

  GetNClosestIndices(position: Vector3, n: number): number[] {
    let indices = new Array<number>();
    let distances = new Map<number, number>();

    for (let i = 0; i < this.nodes.length; i++) {
      const distance = this.nodes[i].vector.manhattanDistanceTo(position);
      distances.set(i, distance);
    }

    const sortedDistances = Array.from(distances.entries()).sort((a, b) => a[1] - b[1]);

    for (let i = 0; i < n; i++) {
      indices.push(sortedDistances[i][0]);
    }

    return indices;
  }

  GetBoundingBoxIndices(position: Vector3, n: number) {
    const bb: number[] = [];
    const closestNodeIndex = this.GetClosestIndices(position);
    const examiningNode = this.nodes[closestNodeIndex[0]];
    const closestIndices = this.GetClosestIndices(examiningNode.vector);

    bb.push(...closestIndices);

    let xCoords: number[] = [];
    let zCoords: number[] = [];

    closestIndices.forEach(ind => {
      const node = this.nodes[ind];
      if (!xCoords.includes(node.x)) xCoords.push(node.x);
      if (!zCoords.includes(node.z)) zCoords.push(node.z);
    });

    xCoords.forEach(x => {
      zCoords.forEach(z => {
        const newNode = new Node(x, this.height, z);
        const nodeInd = this.GetNodeIndexByPosition(newNode.vector);
        if (nodeInd > -1 && !bb.includes(nodeInd)) bb.push(nodeInd);
      });
    });

    if (bb.length >= n * n || closestIndices.length < 3) return bb;

    let aloneIndex: number = -1;

    for (let i = 1; i < closestIndices.length; i++) {
      const iNode = this.nodes[closestIndices[i]];
      let isAlone = true;
      for (let j = i + 1; j < closestIndices.length; j++) {
        const jNode = this.nodes[closestIndices[j]];
        if (iNode.x === jNode.x || iNode.z === jNode.z) {
          isAlone = false;
          break;
        }
      }
      if (!isAlone) continue;
      aloneIndex = i;
      break;
    }

    if (aloneIndex < 0) {
      console.error("did not find an alone index");
      return bb;
    }

    const closestHelperIndices = this.GetClosestIndices(this.nodes[aloneIndex].vector);

    xCoords = [];
    zCoords = [];

    closestHelperIndices.forEach(ind => {
      const node = this.nodes[ind];
      if (!xCoords.includes(node.x)) xCoords.push(node.x);
      if (!zCoords.includes(node.z)) zCoords.push(node.z);
    });

    xCoords.forEach(x => {
      zCoords.forEach(z => {
        const newNode = new Node(x, this.height, z);
        const nodeInd = this.GetNodeIndexByPosition(newNode.vector);
        if (nodeInd > -1 && !bb.includes(nodeInd)) bb.push(nodeInd);
      });
    });

    return bb;
  }

  RenderCues(navigation: Navigation) {
    try {
      // this.RenderNodes(navigation.path, 0x00ffff);
      this.cuesEid = renderAsEntity(APP.world, NavigationCues(navigation));
      this.cuesObj = APP.world.eid2obj.get(this.cuesEid)!;
      APP.scene!.object3D.add(this.cuesObj);
      this.dest.active = true;
      this.dest.time = new Date();
    } catch (error) {
      //console.log(error);
    }
  }

  RemoveCues() {
    if (!!this.cuesEid) {
      removeEntity(APP.world, this.cuesEid);
      APP.scene!.object3D.remove(this.cuesObj);
      this.dest = { active: false };
      this.cuesEid = -1;
    }
  }

  StopNavigating() {
    if (this.dest.active) {
      this.RemoveCues();
    }
  }

  ShouldFinish() {
    if (avatarPos().distanceTo(this.dest.pos!.vector) < 3) {
      this.StopNavigating();
      virtualAgent.UpdateWithRandomPhrase("success");
    }
    // else if (new Date() - this.dest.time > 30000) this.StopNavigating("cleared");
  }
}

export const navSystem = new NavigationSystem();

export function NavigatingSystem(world: HubsWorld) {
  if (!navSystem.dest.active) return;
  {
    navSystem.ShouldFinish();

    console.log(
      `avatar direction`,
      avatarDirection().toArray().toString(),
      avatarIgnoreYDirection().toArray().toString()
    );
  }
}
