interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ id, checked, onChange }: ToggleProps) {
  return (
    <>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </>
  );
}
