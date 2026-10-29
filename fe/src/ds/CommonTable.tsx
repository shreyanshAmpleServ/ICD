// Re-export centralized shared table and cells from @/shared
export {
  CommonTable,
  type CommonTableProps
} from '@/shared/components/table';

export {
  ReferenceCell,
  PartyCell,
  MoneyCell,
  StatusCell,
  DateCell,
  type ReferenceCellProps,
  type PartyCellProps,
  type MoneyCellProps,
  type StatusCellProps,
  type DateCellProps
} from '@/shared/components/cells';
