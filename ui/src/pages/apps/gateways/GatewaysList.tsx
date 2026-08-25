import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import type { ToolMcpGatewayWithTokens } from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useToast } from "@/context/ToastContext";
import { t, useTranslation } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ErrorState, RelativeTime } from "@/pages/tools/shared";
import { AppsSubNav } from "./AppsSubNav";
import { NewGatewayDialog, gatewaysQueryKey } from "./NewGatewayDialog";
import { gatewayTabHref } from "./gateway-tabs";
import {
  activeTokenCount,
  allowedToolsLabel,
  deriveGatewayApps,
  expiringTokenCount,
  formatScope,
  isGatewayOn,
  latestTokenActivity,
} from "./gateway-helpers";

export function GatewaysList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      {
        label:
          selectedCompany?.name ?? t("appsPage.gateways.list.companyFallback", { defaultValue: "Company" }),
        href: "/dashboard",
      },
      { label: t("appsPage.gateways.list.appsLabel", { defaultValue: "Apps" }), href: "/apps" },
      { label: t("appsPage.gateways.list.gatewaysLabel", { defaultValue: "Gateways" }) },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, selectedCompany?.name, t]);

  const gatewaysQuery = useQuery({
    queryKey: gatewaysQueryKey(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listGateways(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const profilesQuery = useQuery({
    queryKey: queryKeys.tools.profiles(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listProfiles(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const connectionsQuery = useQuery({
    queryKey: queryKeys.tools.connections(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listConnections(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const applicationsQuery = useQuery({
    queryKey: queryKeys.tools.applications(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listApplications(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? "__none__"),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId ?? "__none__"),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const profileById = useMemo(
    () => new Map((profilesQuery.data?.profiles ?? []).map((profile) => [profile.id, profile])),
    [profilesQuery.data],
  );
  const agentNames = useMemo(
    () => new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent.name])),
    [agentsQuery.data],
  );
  const projectNames = useMemo(
    () => new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name])),
    [projectsQuery.data],
  );

  const toggleMutation = useMutation({
    mutationFn: ({ gateway }: { gateway: ToolMcpGatewayWithTokens }) =>
      toolsApi.updateGateway(selectedCompanyId!, gateway.id, {
        status: isGatewayOn(gateway) ? "disabled" : "active",
      }),
    onSuccess: async (gateway) => {
      pushToast({
        title:
          gateway.status === "active"
            ? t("appsPage.gateways.list.gatewayOnTitle", { defaultValue: "Gateway on" })
            : t("appsPage.gateways.list.gatewayOffTitle", { defaultValue: "Gateway off" }),
        body:
          gateway.status === "active"
            ? t("appsPage.gateways.list.gatewayOnBody", {
                defaultValue: "{{name}} is exposing its tools again.",
                name: gateway.name,
              })
            : t("appsPage.gateways.list.gatewayOffBody", {
                defaultValue: "{{name}} is off — every client goes silent.",
                name: gateway.name,
              }),
        tone: "success",
      });
      await queryClient.invalidateQueries({ queryKey: gatewaysQueryKey(selectedCompanyId!) });
    },
    onError: (error) =>
      pushToast({
        title: t("appsPage.gateways.list.updateFailedTitle", {
          defaultValue: "Couldn't update the gateway",
        }),
        body: error instanceof Error ? error.message : String(error),
        tone: "error",
      }),
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("appsPage.gateways.list.selectCompany", {
          defaultValue: "Select a company to manage gateways.",
        })}
      </div>
    );
  }

  const gateways = gatewaysQuery.data?.gateways ?? [];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? gateways.filter((gateway) => {
        const scope = formatScope(gateway, projectNames, agentNames).toLowerCase();
        return (
          gateway.name.toLowerCase().includes(term) ||
          gateway.displaySlug.toLowerCase().includes(term) ||
          scope.includes(term)
        );
      })
    : gateways;

  return (
    <div className="max-w-5xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("appsPage.gateways.list.appsLabel", { defaultValue: "Apps" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("appsPage.gateways.list.intro", {
            defaultValue:
              "A gateway is one safe MCP endpoint that exposes only the apps you assign. Hand it to a client like Cursor or Claude Desktop.",
          })}
        </p>
      </header>

      <AppsSubNav active="gateways" />

      {gatewaysQuery.isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : gatewaysQuery.isError ? (
        <ErrorState error={gatewaysQuery.error} onRetry={() => gatewaysQuery.refetch()} />
      ) : gateways.length === 0 ? (
        <EmptyGateways onCreate={() => setCreating(true)} />
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("appsPage.gateways.list.searchPlaceholder", {
                  defaultValue: "Search by name, app, or owner",
                })}
                className="pl-9"
                aria-label={t("appsPage.gateways.list.searchAriaLabel", {
                  defaultValue: "Search gateways",
                })}
              />
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("appsPage.gateways.list.newGateway", { defaultValue: "New gateway" })}
            </Button>
          </div>

          {(() => {
            const rows = filtered.map((gateway) => {
              const profile = profileById.get(gateway.profileId);
              const apps = deriveGatewayApps(
                profile,
                applicationsQuery.data?.applications ?? [],
                connectionsQuery.data?.connections ?? [],
              );
              return {
                gateway,
                profile,
                scope: formatScope(gateway, projectNames, agentNames),
              appsLabel: `${t("appsPage.gateways.list.appCount", {
                defaultValue: "{{count}} apps",
                count: apps.length,
              })}${profile ? ` · ${allowedToolsLabel(profile)}` : ""}`,
                active: activeTokenCount(gateway),
                expiring: expiringTokenCount(gateway),
                lastUsed: latestTokenActivity(gateway),
                href: gatewayTabHref(gateway.id, "overview"),
              };
            });
            const toggle = (gateway: ToolMcpGatewayWithTokens) => (
              <ToggleSwitch
                checked={isGatewayOn(gateway)}
                disabled={toggleMutation.isPending}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={() => toggleMutation.mutate({ gateway })}
                aria-label={t("appsPage.gateways.list.toggleAriaLabel", {
                  defaultValue: "Turn {{name}} {{state}}",
                  name: gateway.name,
                  state: isGatewayOn(gateway)
                    ? t("appsPage.gateways.list.stateOff", { defaultValue: "off" })
                    : t("appsPage.gateways.list.stateOn", { defaultValue: "on" }),
                })}
              />
            );
            const empty = (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("appsPage.gateways.list.noMatch", {
                  defaultValue: "No gateways match “{{term}}”.",
                  term: search.trim(),
                })}
              </div>
            );
            return (
              <>
                {/* Desktop / tablet: full table. */}
                <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
                  <table className="w-full min-w-(--sz-40rem) text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5">
                          {t("appsPage.gateways.list.columnGateway", { defaultValue: "Gateway" })}
                        </th>
                        <th className="px-4 py-2.5">
                          {t("appsPage.gateways.list.columnScope", { defaultValue: "Scope" })}
                        </th>
                        <th className="px-4 py-2.5">
                          {t("appsPage.gateways.list.appsLabel", { defaultValue: "Apps" })}
                        </th>
                        <th className="px-4 py-2.5">
                          {t("appsPage.gateways.list.columnTokens", { defaultValue: "Tokens" })}
                        </th>
                        <th className="px-4 py-2.5">
                          {t("appsPage.gateways.list.columnLastUsed", { defaultValue: "Last used" })}
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          {t("appsPage.gateways.list.columnOn", { defaultValue: "On" })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ gateway, scope, appsLabel, active, expiring, lastUsed, href }) => (
                        <tr
                          key={gateway.id}
                          onClick={() => navigate(href)}
                          className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{gateway.name}</div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {endpointHost(gateway.endpointPath, gateway.displaySlug)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{scope}</td>
                          <td className="px-4 py-3 text-muted-foreground">{appsLabel}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {t("appsPage.gateways.list.activeCount", {
                              defaultValue: "{{count}} active",
                              count: active,
                            })}
                            {expiring > 0
                              ? t("appsPage.gateways.list.expiringSuffix", {
                                  defaultValue: " · {{count}} expiring",
                                  count: expiring,
                                })
                              : ""}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {lastUsed ? <RelativeTime value={lastUsed} /> : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">{toggle(gateway)}</div>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6}>{empty}</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked cards so the On toggle stays reachable and thumb-sized. */}
                <div className="space-y-3 sm:hidden">
                  {rows.map(({ gateway, scope, appsLabel, active, expiring, lastUsed, href }) => (
                    <div
                      key={gateway.id}
                      onClick={() => navigate(href)}
                      className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{gateway.name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {endpointHost(gateway.endpointPath, gateway.displaySlug)}
                          </div>
                        </div>
                        <div className="shrink-0">{toggle(gateway)}</div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <MobileField
                          label={t("appsPage.gateways.list.columnScope", { defaultValue: "Scope" })}
                          value={scope}
                        />
                        <MobileField
                          label={t("appsPage.gateways.list.appsLabel", { defaultValue: "Apps" })}
                          value={appsLabel}
                        />
                        <MobileField
                          label={t("appsPage.gateways.list.columnTokens", { defaultValue: "Tokens" })}
                          value={`${t("appsPage.gateways.list.activeCount", {
                            defaultValue: "{{count}} active",
                            count: active,
                          })}${
                            expiring > 0
                              ? t("appsPage.gateways.list.expiringSuffix", {
                                  defaultValue: " · {{count}} expiring",
                                  count: expiring,
                                })
                              : ""
                          }`}
                        />
                        <MobileField
                          label={t("appsPage.gateways.list.columnLastUsed", { defaultValue: "Last used" })}
                          value={lastUsed ? <RelativeTime value={lastUsed} /> : "—"}
                        />
                      </dl>
                    </div>
                  ))}
                  {rows.length === 0 ? (
                    <div className="rounded-lg border border-border">{empty}</div>
                  ) : null}
                </div>
              </>
            );
          })()}

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="text-sm font-semibold text-foreground">
              {t("appsPage.gateways.list.whyGatewayHeading", { defaultValue: "Why a gateway?" })}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("appsPage.gateways.list.whyGatewayBody", {
                defaultValue:
                  "You pick which apps go through it, who can use it, and how. Revoke the token, the whole gateway goes silent — no app-by-app cleanup.",
              })}
            </p>
          </div>
        </div>
      )}

      <NewGatewayDialog
        companyId={selectedCompanyId}
        open={creating}
        onOpenChange={setCreating}
        onCreated={(gatewayId) => navigate(gatewayTabHref(gatewayId, "overview"))}
      />
    </div>
  );
}

/** Show `mcp.host/g/<slug>` when the endpoint is absolute, else the raw path. */
function endpointHost(endpointPath: string, slug: string): string {
  if (typeof window !== "undefined") {
    try {
      const host = new URL(window.location.origin).host;
      return `${host}${endpointPath}`;
    } catch {
      /* fall through */
    }
  }
  return endpointPath || `/g/${slug}`;
}

/** One label:value pair inside a mobile stacked card. */
function MobileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-foreground">{value}</dd>
    </div>
  );
}

function EmptyGateways({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        {t("appsPage.gateways.list.emptyTitle", { defaultValue: "No gateways yet" })}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {t("appsPage.gateways.list.emptyBody", {
          defaultValue:
            "Group your connected apps into one safe endpoint you can hand to a client, then revoke it in one move.",
        })}
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-1.5 h-4 w-4" />
        {t("appsPage.gateways.list.newGateway", { defaultValue: "New gateway" })}
      </Button>
    </div>
  );
}
