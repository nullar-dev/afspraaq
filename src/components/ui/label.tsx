import * as React from 'react';

function Label({ style, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="label" style={style} {...props} />;
}

export { Label };
