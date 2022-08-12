export type $Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type $RemoveChildren<T extends React.ComponentType> = $Omit<
  React.ComponentPropsWithoutRef<T>,
  'children'
>;
