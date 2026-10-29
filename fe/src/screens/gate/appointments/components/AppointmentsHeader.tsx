import { CalendarPlus } from 'lucide-react';
import { Button, PageHeader } from '@/ds/components';

interface AppointmentsHeaderProps {
  onBook: () => void;
}

export function AppointmentsHeader({ onBook }: AppointmentsHeaderProps) {
  return (
    <PageHeader
      title="Appointments"
      ms="M5"
      sub="Truck booking slots per hour and visit type. Agents book through the portal; the desk books for walk-in calls."
      actions={
        <Button variant="primary" icon={<CalendarPlus />} perm="appointment.book" onClick={onBook}>
          Book appointment
        </Button>
      }
    />
  );
}
