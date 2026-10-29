import { useParams } from 'react-router-dom';
import { StatementsListView } from './components/StatementsListView';
import { StatementDetailView } from './components/StatementDetailView';

export { statementsApi } from './api';

export function StatementsView() {
  const { partyId } = useParams();
  const id = Number(partyId) || 0;

  if (!id) {
    return <StatementsListView />;
  }

  return <StatementDetailView key={id} partyId={id} />;
}

export { StatementsView as Statements };
export default StatementsView;
