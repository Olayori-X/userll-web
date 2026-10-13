"use client";

import type { ComponentProps } from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

/**
 * A menu that opens from a button: account menus, row actions.
 *
 *   <DropdownMenu>
 *     <DropdownMenuTrigger render={<Button variant="ghost" />}>Account</DropdownMenuTrigger>
 *     <DropdownMenuContent>
 *       <DropdownMenuItem render={<Link href="/orders" />}>My orders</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 *
 * Arrow keys, Enter, Escape and typing a letter to jump all work, because Base UI handles them.
 * An item that goes to another page uses render={<Link href="..." />}, so it is a real link.
 */

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

type ContentProps = Omit<ComponentProps<typeof Menu.Popup>, "className"> &
  Pick<ComponentProps<typeof Menu.Positioner>, "side" | "align" | "sideOffset"> & {
    className?: string;
  };

export function DropdownMenuContent({ className, side = "bottom", align = "end", sideOffset = 8, ...props }: ContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          className={cn(
            "min-w-52 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            // fade and shrink slightly when opening and closing
            "transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

type ItemProps = Omit<ComponentProps<typeof Menu.Item>, "className"> & { className?: string };

export function DropdownMenuItem({ className, ...props }: ItemProps) {
  return (
    <Menu.Item
      className={cn(
        "flex w-full cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none select-none",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** A small heading inside the menu, for example the person's name and email at the top. */
export function DropdownMenuLabel({ className, ...props }: ComponentProps<"div">) {
  return <div role="presentation" className={cn("px-2.5 py-2 text-sm", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<"div">) {
  return <div role="separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}