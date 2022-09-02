import React from 'react';
import { FxBox, FxBoxProps } from '../box/box';
import { Cell } from './cell';
import { Header } from './header';
import { Row, RowGroup } from './row';
import { Title } from './title';

type FxTableProps = FxBoxProps;

export const FxTable = ({ children, ...rest }: FxTableProps) => {
  return <FxBox {...rest}>{children}</FxBox>;
};

FxTable.Header = Header;
FxTable.Title = Title;
FxTable.Row = Row;
FxTable.RowGroup = RowGroup;
FxTable.Cell = Cell;
