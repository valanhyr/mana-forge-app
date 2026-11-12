import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';

const join = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ');

export const Tabs = RadixTabs.Root;

type TabsVariant = 'default' | 'underline';

export const TabsList = forwardRef<
  ElementRef<typeof RadixTabs.List>,
  ComponentPropsWithoutRef<typeof RadixTabs.List> & { variant?: TabsVariant }
>(({ className, variant = 'default', ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={join(
      variant === 'underline'
        ? 'flex w-full items-center gap-6 overflow-x-auto border-b border-zinc-800 text-zinc-400'
        : 'inline-flex items-center rounded-md bg-zinc-800 p-1 text-zinc-400',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
  ElementRef<typeof RadixTabs.Trigger>,
  ComponentPropsWithoutRef<typeof RadixTabs.Trigger> & { variant?: TabsVariant }
>(({ className, variant = 'default', ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={join(
      variant === 'underline'
        ? 'inline-flex shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 data-[state=active]:border-orange-500 data-[state=active]:text-orange-400'
        : 'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  ElementRef<typeof RadixTabs.Content>,
  ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={join(
      'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
