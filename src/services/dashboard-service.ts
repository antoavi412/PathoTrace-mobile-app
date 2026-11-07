import type { DashboardSummary, Resource } from '@/types';
import { countRisk, sortAssessmentsByDate } from '@/utils/risk';
import { applyAlertReadOverrides } from './alert-service';
import { getDemoDashboard } from './demo/demo-data';
import { readAlertReadIds } from './local-store';
import { remoteAlerts, remoteAllCows, remoteAssessments } from './remote/api';
import { resolveResource } from './resource';

export function fetchDashboard(): Promise<Resource<DashboardSummary>> {
  return resolveResource({
    key: 'dashboard',
    demo: async () => {
      const readIds = await readAlertReadIds();
      const summary = getDemoDashboard();
      return {
        ...summary,
        recentAlerts: applyAlertReadOverrides(summary.recentAlerts, readIds),
      };
    },
    remote: async () => {
      const [cows, assessments, alerts, readIds] = await Promise.all([
        remoteAllCows(),
        remoteAssessments(),
        remoteAlerts(),
        readAlertReadIds(),
      ]);
      const counts = countRisk(cows);
      const sortedAssessments = sortAssessmentsByDate(assessments);

      return {
        totalCattle: cows.length,
        highRisk: counts.high,
        mediumRisk: counts.medium,
        lowRisk: counts.low,
        unknownRisk: counts.unknown,
        recentAssessments: sortedAssessments.slice(0, 4),
        recentAlerts: applyAlertReadOverrides(alerts, readIds).slice(0, 3),
        lastUpdated: new Date().toISOString(),
      };
    },
  });
}
