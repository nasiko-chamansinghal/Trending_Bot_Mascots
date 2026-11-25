import { BODY_STYLES, type BodyStyle, setBodyStyle, useBodyStyle } from '../bodyStyle';

export function BodyPicker() {
  const body = useBodyStyle();
  return (
    <div className="body-switch" role="radiogroup" aria-label="Body">
      {BODY_STYLES.map((style) => (
        <label key={style.id} className="body-option">
          <input
            className="visually-hidden"
            type="radio"
            name="body"
            value={style.id}
            checked={style.id === body}
            onChange={() => setBodyStyle(style.id as BodyStyle)}
          />
          <span className="body-option-label">{style.name}</span>
        </label>
      ))}
    </div>
  );
}
