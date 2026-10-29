import { Empty, Panel } from '@/ds/components';

export function DepotClosedPanel() {
  return (
    <Panel>
      <Empty title="The depot is closed on Sundays">
        No slots are open. Pick another day, or change the slot rules if Sunday work is agreed.
      </Empty>
    </Panel>
  );
}
