import * as React from 'react';

function Button({ style, disabled, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      data-slot="button"
      disabled={disabled}
      style={{
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      {...props}
    />
  );
}

export { Button };
