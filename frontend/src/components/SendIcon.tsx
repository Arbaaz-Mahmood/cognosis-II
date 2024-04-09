import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const SendIcon: React.FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props}>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </SvgIcon>
  );
};
export default SendIcon;