# Containment Kubernetes Sandbox Deployment Guide

This directory contains the production Kubernetes manifests for running **Containment** alongside its isolated, hardened **Kubernetes Sandbox Runtime**.

---

## 1. Architecture: Defense in Depth

Containment implements a two-tier containment security architecture:
1. **Action Firewall Tier (In-Memory / Under 10ms)**: Every command, file path, outbound IP/domain, and prompt injection payload is intercepted and evaluated before execution. Dangerous actions (reverse shells, AWS metadata harvesting, directory escapes) are blocked outright.
2. **Kubernetes Sandbox Tier (Isolated Pod Execution)**: Actions that receive an `ALLOW` verdict (or explicit human approval) execute within an isolated Kubernetes Pod adhering to **Kubernetes Restricted Pod Security Standards**:
   - Dropped Linux capabilities (`drop: [ALL]`)
   - Read-only root filesystem (`readOnlyRootFilesystem: true`)
   - Non-root user execution (`runAsNonRoot: true`, UID 1000)
   - Disallowed privilege escalation (`allowPrivilegeEscalation: false`)
   - RuntimeDefault seccomp profile
   - Strict `NetworkPolicy` blocking internal cluster subnets and cloud metadata IP (`169.254.169.254`)
   - Ephemeral emptyDir volume limits on `/workspace` and `/tmp`
   - Optional hypervisor/microVM isolation via **gVisor (`runsc`)** or **Kata Containers**.

---

## 2. Manifest Inventory

| File | Purpose |
|------|---------|
| `00-namespace.yaml` | Creates `containment-sandbox` namespace with Pod Security Standard labels (`restricted`). |
| `01-rbac.yaml` | ServiceAccount (`containment-runner`), Role, and RoleBinding for sandbox pod lifecycle and execution. |
| `02-network-policy.yaml` | Denies all ingress, restricts egress to DNS and public internet (blocking RFC1918 subnets and 169.254.169.254). |
| `03-resource-quota.yaml` | ResourceQuota and LimitRange setting limits on CPU, memory, and ephemeral storage. |
| `04-sandbox-pod.yaml` | Baseline template for ephemeral agent execution pods. |
| `05-containment-deployment.yaml` | Deployment and ClusterIP Service for running the Containment web control plane in-cluster. |

---

## 3. Quickstart Deployment

### Option A: Local Minikube / Kind

```bash
# 1. Start Minikube or Kind
minikube start --container-runtime=containerd

# 2. Apply the sandbox namespace and security policies
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-rbac.yaml
kubectl apply -f k8s/02-network-policy.yaml
kubectl apply -f k8s/03-resource-quota.yaml

# 3. Verify namespace status and restricted profile
kubectl get ns containment-sandbox --show-labels
```

### Option B: Google Kubernetes Engine (GKE) with GKE Sandbox (gVisor)

GKE Sandbox provides defense-in-depth kernel isolation using gVisor:

```bash
# 1. Create a GKE node pool with GKE Sandbox enabled
gcloud container node-pools create sandbox-pool \
  --cluster=<YOUR_CLUSTER> \
  --sandbox type=gvisor \
  --num-nodes=2

# 2. Apply manifests
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-rbac.yaml
kubectl apply -f k8s/02-network-policy.yaml
kubectl apply -f k8s/03-resource-quota.yaml

# 3. Set runtimeClassName to gvisor in your environment
export K8S_SANDBOX_RUNTIME_CLASS="gvisor"
```

### Option C: AWS EKS with Bottlerocket

```bash
# Enable NetworkPolicy using Amazon VPC CNI or Calico:
kubectl apply -k github.com/aws/amazon-vpc-cni-k8s//config/master/network-policy

# Apply Containment manifests:
kubectl apply -f k8s/
```

---

## 4. Environment Configuration

Containment auto-detects its environment:

| Variable | Description | Default |
|----------|-------------|---------|
| `K8S_IN_CLUSTER` | Set to `"true"` when running inside Kubernetes pod | Auto-detected |
| `K8S_API_URL` | Kubernetes API endpoint (if external) | `https://kubernetes.default.svc` |
| `K8S_TOKEN` | ServiceAccount bearer token | Read from in-cluster secret |
| `K8S_SANDBOX_NAMESPACE` | Target namespace for sandbox pods | `containment-sandbox` |
| `K8S_SANDBOX_IMAGE` | Container image for sandbox execution | `node:20-slim` |
| `K8S_SANDBOX_RUNTIME_CLASS`| Runtime class (e.g. `gvisor`, `runsc`, `kata`) | `""` |
| `K8S_EMULATION_MODE` | Force built-in emulation mode for local development | `"auto"` |
