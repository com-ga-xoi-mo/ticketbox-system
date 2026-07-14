interface Props {
  message?: string;
  id?: string;
}

export function FieldError({ message, id }: Props) {
  if (!message) return null;
  return <p id={id} className="text-xs text-error mt-1">{message}</p>;
}
