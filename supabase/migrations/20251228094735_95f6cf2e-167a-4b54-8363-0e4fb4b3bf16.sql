-- Drop existing policies on menus
DROP POLICY IF EXISTS "Admins can manage all menus" ON public.menus;
DROP POLICY IF EXISTS "Anyone can view active menus" ON public.menus;
DROP POLICY IF EXISTS "Venue managers can manage menus" ON public.menus;

-- Create comprehensive policies for menus
CREATE POLICY "Admins can manage all menus" 
ON public.menus 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active menus" 
ON public.menus 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Venue managers can view all menus" 
ON public.menus 
FOR SELECT 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can insert menus" 
ON public.menus 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can update menus" 
ON public.menus 
FOR UPDATE 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can delete menus" 
ON public.menus 
FOR DELETE 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- Drop existing policies on menu_items
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Anyone can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Venue managers can manage menu items" ON public.menu_items;

-- Create comprehensive policies for menu_items
CREATE POLICY "Admins can manage all menu items" 
ON public.menu_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view available menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Venue managers can view all menu items" 
ON public.menu_items 
FOR SELECT 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can insert menu items" 
ON public.menu_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can update menu items" 
ON public.menu_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can delete menu items" 
ON public.menu_items 
FOR DELETE 
USING (has_role(auth.uid(), 'venue_manager'::app_role));