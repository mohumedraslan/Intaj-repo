-- Drop existing policies if they exist, to ensure a clean slate.
DROP POLICY IF EXISTS "Enable public read access for public chatbots" ON public.chatbots;
DROP POLICY IF EXISTS "Users can manage their own chatbots" ON public.chatbots;

-- Create a policy that allows public, read-only access to chatbots that are explicitly marked as public.
-- This is for the embeddable widget feature.
CREATE POLICY "Enable public read access for public chatbots"
ON public.chatbots
FOR SELECT
USING (is_public = TRUE);

-- Re-create the policy that allows users to perform all actions on their own chatbots.
-- This ensures that users can still manage their private chatbots.
CREATE POLICY "Users can manage their own chatbots"
ON public.chatbots
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
