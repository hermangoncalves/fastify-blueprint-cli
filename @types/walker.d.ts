declare module "walker" {
  import { EventEmitter } from "events";

  export default function walker(root: string): EventEmitter;
}
