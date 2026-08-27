import type { CameraWaypoint, Vec3 } from "../presentation/types";

export function waypointQueue(camera: CameraWaypoint | CameraWaypoint[]): CameraWaypoint[] {
  return Array.isArray(camera) ? camera : [camera];
}


export function cloneWaypoints(camera: CameraWaypoint | CameraWaypoint[]): CameraWaypoint[] {
  return waypointQueue(camera).map((wp) => ({
    ...wp,
    position: [wp.position[0], wp.position[1], wp.position[2]],
    lookAt: [wp.lookAt[0], wp.lookAt[1], wp.lookAt[2]],
    idleDrift: wp.idleDrift ? { ...wp.idleDrift } : undefined,
  }));
}

export function firstWaypoint(camera: CameraWaypoint | CameraWaypoint[]): CameraWaypoint {
  return waypointQueue(camera)[0];
}

export function restingWaypoint(camera: CameraWaypoint | CameraWaypoint[]): CameraWaypoint {
  const queue = waypointQueue(camera);
  return queue[queue.length - 1];
}

export function averageLookAt(camera: CameraWaypoint | CameraWaypoint[]): Vec3 {
  const waypoints = waypointQueue(camera);
  const sum = waypoints.reduce<Vec3>(
    (acc, wp) => [acc[0] + wp.lookAt[0], acc[1] + wp.lookAt[1], acc[2] + wp.lookAt[2]],
    [0, 0, 0]
  );
  return [sum[0] / waypoints.length, sum[1] / waypoints.length, sum[2] / waypoints.length];
}

export function firstLegDuration(camera: CameraWaypoint | CameraWaypoint[]): number {
  return firstWaypoint(camera)?.transitionDuration ?? 3;
}
