import { TaskConfig } from "../src/types/class";

export interface TaskInput {
  task: TaskConfig["task"];
  template: {
    producer: TaskConfig["template"]["producer"];
    scraper?: TaskConfig["template"]["scraper"];
  };
  regex: {
    download_name: TaskConfig["regex"]["download_name"];
  };
  parameter: {
    build_manifest: TaskConfig["parameter"]["build_manifest"];
  };
  producer_required: unknown;
}
