import { Object3D } from "three";
import { Label, roomPropertiesReader } from "../utils/rooms-properties";
import { ArrayVec3, renderAsEntity } from "../utils/jsx-entity";
import { SimpleImagePanel } from "../prefabs/tutorial-panels";
import { removeEntity } from "bitecs";

class SceneObject {
  ref: number;
  obj: Object3D;

  constructor(ref: number | null = null, obj: Object3D | null = null) {
    if (ref) {
      this.ref = ref;
      this.obj = APP.world.eid2obj.get(this.ref)!;
    } else if (obj) this.obj = obj;
  }
}

class RoomLabelOrganizer {
  labels: Array<SceneObject>;
  labelProps: Label[];

  constructor() {
    this.labels = new Array<SceneObject>();
    this.labelProps = [];
  }
  Init() {
    this.labels.forEach(label => {
      APP.world.scene.remove(label.obj);
      removeEntity(APP.world, label.ref);
    });
    this.labels = new Array<SceneObject>();
    this.labelProps = roomPropertiesReader.roomProps.labels;

    this.labelProps.forEach(label => {
      label.filename = `${roomPropertiesReader.serverURL}/file/${label.filename}`;
      const ref = renderAsEntity(APP.world, SimpleImagePanel(label));

      const labelEntity = new SceneObject(ref);
      APP.world.scene.add(labelEntity.obj);
      this.labels.push(labelEntity);
    });
  }
}

export const labelOrganizer = new RoomLabelOrganizer();
