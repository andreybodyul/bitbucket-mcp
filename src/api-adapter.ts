/**
 * Adapter layer for supporting both Bitbucket Cloud (v2.0) and Bitbucket Server/Data Center (v1.0) APIs.
 */

export type ApiVariant = "cloud" | "server";

/**
 * Detect whether the configured base URL points to Bitbucket Cloud or Server.
 */
export function detectVariant(baseUrl: string): ApiVariant {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (
      host === "bitbucket.org" ||
      host === "www.bitbucket.org" ||
      host === "api.bitbucket.org"
    ) {
      return "cloud";
    }
  } catch {
    // invalid URL — assume server
  }
  return "server";
}

/**
 * Ensure the base URL has the correct API prefix for the detected variant.
 */
export function normalizeBaseUrl(
  baseUrl: string,
  variant: ApiVariant
): string {
  if (variant === "server") {
    const stripped = baseUrl.replace(/\/+$/, "");
    if (!stripped.includes("/rest/api/")) {
      return `${stripped}/rest/api/1.0`;
    }
    return stripped;
  }
  return baseUrl;
}

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

export function repoBase(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string
): string {
  return variant === "cloud"
    ? `/repositories/${workspace}/${repoSlug}`
    : `/projects/${workspace}/repos/${repoSlug}`;
}

export function prList(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string
): string {
  const rb = repoBase(variant, workspace, repoSlug);
  return variant === "cloud"
    ? `${rb}/pullrequests`
    : `${rb}/pull-requests`;
}

export function prBase(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  const rb = repoBase(variant, workspace, repoSlug);
  return variant === "cloud"
    ? `${rb}/pullrequests/${prId}`
    : `${rb}/pull-requests/${prId}`;
}

export function prComments(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/comments`;
}

export function prComment(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string,
  commentId: string
): string {
  return `${prComments(variant, workspace, repoSlug, prId)}/${commentId}`;
}

export function prApprove(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/approve`;
}

export function prMerge(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/merge`;
}

export function prDecline(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/decline`;
}

export function prActivity(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  const pb = prBase(variant, workspace, repoSlug, prId);
  return variant === "cloud"
    ? `${pb}/activity`
    : `${pb}/activities`;
}

export function prCommits(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/commits`;
}

export function prDiff(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/diff`;
}

export function prChanges(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  const pb = prBase(variant, workspace, repoSlug, prId);
  return variant === "cloud"
    ? `${pb}/diffstat`
    : `${pb}/changes`;
}

export function prTasks(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/tasks`;
}

export function prStatuses(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/statuses`;
}

export function prPatch(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string,
  prId: string
): string {
  return `${prBase(variant, workspace, repoSlug, prId)}/patch`;
}

export function repoBranchingModel(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string
): string {
  const rb = repoBase(variant, workspace, repoSlug);
  return variant === "cloud"
    ? `${rb}/branching-model`
    : `${rb}/branches/model`;
}

export function repoEffectiveBranchingModel(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string
): string {
  const rb = repoBase(variant, workspace, repoSlug);
  return variant === "cloud"
    ? `${rb}/effective-branching-model`
    : `${rb}/branches/model`;
}

export function repoDefaultReviewers(
  variant: ApiVariant,
  workspace: string,
  repoSlug: string
): string {
  const rb = repoBase(variant, workspace, repoSlug);
  return variant === "cloud"
    ? `${rb}/effective-default-reviewers`
    : `${rb}/conditions`;
}

// ---------------------------------------------------------------------------
// Cloud-only tools
// ---------------------------------------------------------------------------

export const CLOUD_ONLY_TOOLS = new Set<string>([
  // Pipelines
  "listPipelineRuns",
  "getPipelineRun",
  "runPipeline",
  "stopPipeline",
  "getPipelineSteps",
  "getPipelineStep",
  "getPipelineStepLogs",
  // Draft PRs
  "createDraftPullRequest",
  "publishDraftPullRequest",
  "convertTodraft",
  // Pending comments
  "addPendingPullRequestComment",
  "publishPendingComments",
  // Tasks
  "getPullRequestTasks",
  "createPullRequestTask",
  "getPullRequestTask",
  "updatePullRequestTask",
  // Branching model settings
  "getRepositoryBranchingModelSettings",
  "updateRepositoryBranchingModelSettings",
  "getProjectBranchingModel",
  "getProjectBranchingModelSettings",
  "updateProjectBranchingModelSettings",
  // Other Cloud-only
  "getPullRequestStatuses",
  "getPullRequestDiffStat",
  "getPullRequestPatch",
  "getPendingReviewPRs",
]);

// ---------------------------------------------------------------------------
// Body builders
// ---------------------------------------------------------------------------

export interface CreatePRParams {
  workspace: string;
  repoSlug: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  reviewers?: string[];
  draft?: boolean;
}

export function buildCreatePRBody(variant: ApiVariant, params: CreatePRParams) {
  if (variant === "cloud") {
    const body: Record<string, any> = {
      title: params.title,
      description: params.description,
      source: { branch: { name: params.sourceBranch } },
      destination: { branch: { name: params.targetBranch } },
      close_source_branch: true,
    };
    if (params.reviewers?.length) {
      body.reviewers = params.reviewers.map((r) => ({ uuid: r }));
    }
    if (params.draft) {
      body.draft = true;
    }
    return body;
  }

  // Server
  const body: Record<string, any> = {
    title: params.title,
    description: params.description,
    fromRef: {
      id: `refs/heads/${params.sourceBranch}`,
      repository: {
        slug: params.repoSlug,
        project: { key: params.workspace },
      },
    },
    toRef: {
      id: `refs/heads/${params.targetBranch}`,
      repository: {
        slug: params.repoSlug,
        project: { key: params.workspace },
      },
    },
  };
  if (params.reviewers?.length) {
    body.reviewers = params.reviewers.map((r) => ({ user: { name: r } }));
  }
  return body;
}

export interface CommentParams {
  content: string;
  inline?: {
    path: string;
    from?: number;
    to?: number;
  };
  pending?: boolean;
}

export function buildCommentBody(
  variant: ApiVariant,
  params: CommentParams
) {
  if (variant === "cloud") {
    const body: Record<string, any> = {
      content: { raw: params.content },
    };
    if (params.pending) {
      body.pending = true;
    }
    if (params.inline) {
      body.inline = {
        path: params.inline.path,
        ...(params.inline.from !== undefined && { from: params.inline.from }),
        ...(params.inline.to !== undefined && { to: params.inline.to }),
      };
    }
    return body;
  }

  // Server
  const body: Record<string, any> = {
    text: params.content,
  };
  if (params.inline) {
    body.anchor = {
      path: params.inline.path,
      ...(params.inline.to !== undefined && {
        line: params.inline.to,
        lineType: "ADDED",
        fileType: "TO",
      }),
      ...(params.inline.from !== undefined &&
        params.inline.to === undefined && {
          line: params.inline.from,
          lineType: "REMOVED",
          fileType: "FROM",
        }),
    };
  }
  return body;
}

export function buildUpdateCommentBody(
  variant: ApiVariant,
  content: string,
  version?: number
) {
  if (variant === "cloud") {
    return { content: { raw: content } };
  }
  // Server requires version for optimistic locking
  const body: Record<string, any> = { text: content };
  if (version !== undefined) {
    body.version = version;
  }
  return body;
}

export interface MergeParams {
  message?: string;
  strategy?: string;
  version?: number;
}

export function buildMergeBody(variant: ApiVariant, params: MergeParams) {
  if (variant === "cloud") {
    const body: Record<string, any> = {};
    if (params.message) body.message = params.message;
    if (params.strategy) body.merge_strategy = params.strategy;
    return body;
  }

  // Server
  const body: Record<string, any> = {};
  if (params.message) body.message = params.message;
  if (params.version !== undefined) body.version = params.version;
  if (params.strategy) {
    // Map Cloud strategy names to Server names
    const strategyMap: Record<string, string> = {
      "merge-commit": "no-ff",
      squash: "squash",
      "fast-forward": "ff-only",
    };
    body.strategyId = strategyMap[params.strategy] || params.strategy;
  }
  return body;
}
