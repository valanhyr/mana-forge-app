import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

const Switch = forwardRef<
  ElementRef<typeof RadixSwitch.Root>,
  ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(({ className = '', ...props }, ref) => (
  <RadixSwitch.Root
    ref={ref}
    className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-zinc-700 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-orange-500 ${className}`}
    {...props}
  >
    <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5" />
  </RadixSwitch.Root>
));
Switch.displayName = 'Switch';

export default Switch;
