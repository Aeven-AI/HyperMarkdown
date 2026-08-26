export interface PendingToken {
  token: string;
  close: boolean;
  index: number;
}

export interface InlineTokenResult extends PendingToken {
  text: string;
}
