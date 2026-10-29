import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '@/features/container-management/units/api';

export function useContainers() {
  return useQuery({
    queryKey: ['containers-list'],
    queryFn: () => unitsApi.getUnits(),
  });
}

export function useContainerDetail(unitStayId: number) {
  return useQuery({
    queryKey: ['container-detail', unitStayId],
    queryFn: () => unitsApi.getUnitDetail(unitStayId),
    enabled: Boolean(unitStayId),
  });
}

export default useContainers;
