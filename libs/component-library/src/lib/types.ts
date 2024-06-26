export type $Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type $RemoveChildren<T extends React.ComponentType> = $Omit<
  React.ComponentPropsWithoutRef<T>,
  'children'
>;
export type WithPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
export type RequireOnly<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

export type GetRequiredKeys<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type GetOptionalKeys<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};
