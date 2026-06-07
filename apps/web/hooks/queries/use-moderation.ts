import type { AppealDto, MyModerationCaseDto } from '@costy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiQueryData } from '@/lib/api-query';

export function useMyModerationCase(caseId: string | null) {
  return useQuery({
    queryKey: ['moderation', 'case', caseId],
    queryFn: () => apiQueryData<MyModerationCaseDto>(`/me/moderation/cases/${caseId}`),
    enabled: Boolean(caseId),
  });
}

export function useSubmitAppeal(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiQueryData<AppealDto>(`/me/moderation/cases/${caseId}/appeal`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['moderation', 'case', caseId] });
    },
  });
}
