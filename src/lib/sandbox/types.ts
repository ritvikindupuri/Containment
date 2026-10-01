export type SandboxExecutionMode = "in-cluster" | "kubeconfig" | "api" | "emulated";

export type SandboxSecurityContext = {
  runAsUser: number;
  runAsNonRoot: boolean;
  readOnlyRootFilesystem: boolean;
  allowPrivilegeEscalation: boolean;
  droppedCapabilities: string[];
  seccompProfile: "RuntimeDefault" | "Localhost";
  runtimeClassName?: string | null;
};

export type SandboxPod = {
  id: string;
  name: string;
  namespace: string;
  status: "Pending" | "Running" | "Succeeded" | "Failed" | "Terminated";
  image: string;
  ip: string;
  nodeName: string;
  sessionId: string;
  createdAt: string;
  securityContext: SandboxSecurityContext;
  volumes: Array<{ name: string; mountPath: string; sizeLimit: string; readOnly: boolean }>;
};

export type SandboxExecutionResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  podName: string;
  namespace: string;
  executedAt: string;
  actionType: string;
  commandOrTarget: string;
  networkPolicyPassed: boolean;
  resourceUsage: {
    cpuMillis: number;
    memoryMb: number;
  };
};

export type KubernetesClusterStatus = {
  connected: boolean;
  mode: SandboxExecutionMode;
  endpoint: string;
  namespace: string;
  clusterVersion: string;
  runtimeClass: string | null;
  securityStandard: "restricted" | "baseline" | "privileged";
  activePodsCount: number;
  networkPolicyEnforced: boolean;
  quotaUsage: {
    cpuRequests: string;
    memoryRequests: string;
    pods: string;
  };
  nodeInfo: {
    name: string;
    osImage: string;
    containerRuntime: string;
    architecture: string;
  };
};

export type SandboxConfig = {
  namespace: string;
  image: string;
  runtimeClass: string | null;
  timeoutSeconds: number;
  forceEmulation: boolean;
};
