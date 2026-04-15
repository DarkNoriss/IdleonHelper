import { COMPASS_NODE_DEFS } from "@/shared/compass-config";
import { backendCommand } from "../../../backend/index";
import { logger } from "../../../utils/index";
import { defineScript } from "../../define-script";
import {
  COMPASS_CENTER,
  dismissPanel,
  findAnyNode,
  loadGraph,
  navigateToNode,
  openCompass,
  scrollInAtCenter,
} from "./compass-utils";

const REPEATS_PER_NODE = 10;

const shuffleInPlace = <T>(arr: T[]): void => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
};

export default defineScript<[]>({
  id: "classSpecific.compass.stressTestNav",
  name: "Debug: Compass Nav Stress Test",
  run: async ({ token }) => {
    const allNodeIds = COMPASS_NODE_DEFS.map((n) => n.id);

    const queue: string[] = [];
    for (let r = 0; r < REPEATS_PER_NODE; r++) {
      queue.push(...allNodeIds);
    }
    shuffleInPlace(queue);

    logger.log(
      `Stress test: ${allNodeIds.length} unique nodes x ${REPEATS_PER_NODE} = ${queue.length} navigations`
    );

    await openCompass(token);
    await scrollInAtCenter(token, COMPASS_CENTER);
    await dismissPanel(token);

    const startNode = await findAnyNode(token);
    logger.log(`Starting from: ${startNode.id}`);
    await backendCommand.drag(
      startNode.point,
      COMPASS_CENTER,
      { instant: true },
      token
    );

    const graph = loadGraph();
    const visits = new Map<string, number>();
    const failures = new Map<string, number>();

    let current = startNode.id;
    let attempted = 0;
    let arrived = 0;
    let failed = 0;
    const runStart = Date.now();

    const PROGRESS_EVERY = 50;

    for (let i = 0; i < queue.length; i++) {
      token.throwIfCancelled();
      const target = queue[i]!;
      attempted++;

      if (target === current) {
        arrived++;
        visits.set(target, (visits.get(target) ?? 0) + 1);
      } else {
        const result = await navigateToNode(
          current,
          target,
          COMPASS_CENTER,
          graph,
          token,
          { quiet: true }
        );
        const from = current;
        current = result.currentNode;

        if (result.arrived) {
          arrived++;
          visits.set(target, (visits.get(target) ?? 0) + 1);
        } else {
          failed++;
          failures.set(target, (failures.get(target) ?? 0) + 1);
          logger.log(`FAIL [${i + 1}/${queue.length}] ${from} -> ${target}`);
        }
      }

      if ((i + 1) % PROGRESS_EVERY === 0) {
        logger.log(
          `Progress: ${i + 1}/${queue.length} (arrived ${arrived}, failed ${failed})`
        );
      }
    }

    const totalMs = Date.now() - runStart;
    const reached = visits.size;

    logger.log("=== Compass Nav Stress Test Summary ===");
    logger.log(`Elapsed: ${Math.round(totalMs / 1000)}s`);
    logger.log(
      `Attempted: ${attempted}, Arrived: ${arrived}, Failed: ${failed}`
    );
    logger.log(`Unique nodes reached: ${reached}/${allNodeIds.length}`);

    if (failures.size > 0) {
      logger.log("Failures per node:");
      const sorted = [...failures.entries()].sort((a, b) => b[1] - a[1]);
      for (const [node, count] of sorted) {
        logger.log(`  ${node}: ${count}`);
      }
    }

    const unvisited = allNodeIds.filter((id) => !visits.has(id));
    if (unvisited.length > 0) {
      logger.log(
        `Never arrived (${unvisited.length}): [${unvisited.join(", ")}]`
      );
    }
  },
});
