import './barSpinner.css';

interface PropsBarSpinner {
  width: string;
  color?: string;
}

export const BarSpinner = ({ width = '20px', color }: PropsBarSpinner) => {
  return (
    <div
      style={{
        width,
        color: color || 'green',
      }}
      className="loader-bar"
    ></div>
  );
};
