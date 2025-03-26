import { Room, roomPropertiesReader } from "../utils/rooms-properties";

type Category = "navigation" | "tutorial" | "trade_show" | "program_info" | "summary" | "translation" | "general";

type objectiveFunction = (index: number) => void;

interface Objective {
  type: Category;
  completed: boolean;
  value: string;
  valid: boolean;
  room: Room;
  validator?: objectiveFunction;
  checker?: objectiveFunction;
}

const ObjectiveDefaultValues: Objective = {
  type: "general",
  completed: false,
  valid: true,
  room: "lobby",
  value: "hello world"
};

interface ObjectiveCreationParams {
  type?: Category;
  completed?: boolean;
  value?: string;
  valid?: boolean;
  room?: Room;
  validator?: objectiveFunction;
  checker?: objectiveFunction;
}

function CreateObjective(params: ObjectiveCreationParams): Objective {
  return {
    type: params.type || ObjectiveDefaultValues.type,
    room: params.room || ObjectiveDefaultValues.room,
    value: params.value || ObjectiveDefaultValues.value,
    completed: params.completed || ObjectiveDefaultValues.completed,
    valid: params.valid || ObjectiveDefaultValues.valid,
    validator: params.validator || ObjectiveDefaultValues.validator,
    checker: params.checker || ObjectiveDefaultValues.checker
  };
}

let currentRoom: Room;

export const RoomObjectives = {
  lobby: [CreateObjective({})],
  "main area": [
    CreateObjective({ type: "navigation", room: "main area", value: "How can I go to the business room?" }),
    CreateObjective({ type: "navigation", room: "main area", value: "How can I go to the social area?" }),
    CreateObjective({ type: "trade_show", room: "main area", value: "Who will I find in the tradeshows?" }),
    CreateObjective({ type: "program_info", room: "main area", value: "Who is presenting in the morning?" }),
    CreateObjective({
      type: "summary",
      room: "main area",
      value: "Summarize the content of the main presentation",
      validator: (index: number) => {
        validIndices["main area"][index] = visitedRooms.includes("conference room");
      }
    })
  ],
  "conference room": [CreateObjective({})],
  "social area": [CreateObjective({})],
  "business room": [CreateObjective({})],
  unknown: [CreateObjective({})]
};
const resolvedIndices: Record<Room, boolean[]> = {
  lobby: new Array<boolean>(RoomObjectives["lobby"].length).fill(false),
  "main area": new Array<boolean>(RoomObjectives["main area"].length).fill(false),
  "conference room": new Array<boolean>(RoomObjectives["conference room"].length).fill(false),
  "social area": new Array<boolean>(RoomObjectives["social area"].length).fill(false),
  "business room": new Array<boolean>(RoomObjectives["business room"].length).fill(false),
  unknown: new Array<boolean>(RoomObjectives["unknown"].length).fill(false)
};
const validIndices: Record<Room, boolean[]> = {
  lobby: new Array<boolean>(RoomObjectives["lobby"].length).fill(false),
  "main area": new Array<boolean>(RoomObjectives["main area"].length).fill(true),
  "conference room": new Array<boolean>(RoomObjectives["conference room"].length).fill(false),
  "social area": new Array<boolean>(RoomObjectives["social area"].length).fill(false),
  "business room": new Array<boolean>(RoomObjectives["business room"].length).fill(false),
  unknown: new Array<boolean>(RoomObjectives["unknown"].length).fill(false)
};
const visitedRooms: Room[] = [];

export function VisitRoom() {
  currentRoom = roomPropertiesReader.roomProps.name as Room;
  visitedRooms.push(currentRoom);
  console.log(`progress-tracker: new room: ${currentRoom}`, visitedRooms);
}

export function ProgressSystem() {
  if (!currentRoom) return;

  RoomObjectives[currentRoom].forEach((objective, index) => {
    if (resolvedIndices[currentRoom][index]) return;
    if (objective.validator) objective.validator(index);
  });
}

export function GetObjectives() {
  return RoomObjectives[currentRoom];
}
export function GetValids() {
  return validIndices[currentRoom];
}
export function GetResolved() {
  return resolvedIndices[currentRoom];
}

export function MakeObjectiveValid(index: number, valid: boolean) {
  validIndices[currentRoom][index] = valid;
}

export function MakeObjectiveResolved(index: number, valid: boolean) {
  resolvedIndices[currentRoom][index] = valid;
}
