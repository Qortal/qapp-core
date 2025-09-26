import { Card, CardContent } from '@mui/material';
import { ReactNode } from 'react';

interface PropsCardWrapper {
  isInCart: boolean;
  children: ReactNode | ReactNode[];
  height?: number;
}
export const ItemCardWrapper = ({
  children,
  isInCart,
  height,
}: PropsCardWrapper) => {
  return (
    <Card
      sx={{
        width: '100%',
        height: height || 'auto',
      }}
    >
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          p: 1,
          '&:last-child': { pb: 1 },
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};
