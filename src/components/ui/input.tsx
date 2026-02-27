import * as React from 'react';

function Input({ style, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" style={style} {...props} />;
}

export { Input };
