interface Props {
  message?: string;
}

export function FieldError({ message }: Props) {
  if (!message) return null;
  return <p className="text-xs text-error mt-1">{message}</p>;
}
