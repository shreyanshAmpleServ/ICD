import { useParams } from 'react-router-dom';
import { StatementsListView } from './StatementsListView';
import { StatementDetailView } from './StatementDetailView';

export function StatementsView() {
  const { partyId } = useParams();
  const id = Number(partyId) || 0;

  if (!id) {
    return <StatementsListView />;
  }

  return <StatementDetailView key={id} partyId={id} />;
}
