// Debug utility for agent creation issues
// This utility helps diagnose problems with agent creation and database operations

import { supabase } from '@/lib/supabaseClient';

interface DebugResult {
  success: boolean;
  message: string;
  details?: any;
}

export class AgentDebugger {
  
  // Check if user is authenticated
  static async checkAuth(): Promise<DebugResult> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        return {
          success: false,
          message: 'Authentication error',
          details: { error: error.message, code: error.status }
        };
      }
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }
      return {
        success: true,
        message: 'User authenticated',
        details: { userId: user.id, email: user.email }
      };
    } catch (err) {
      return {
        success: false,
        message: 'Auth check failed',
        details: { error: err instanceof Error ? err.message : String(err) }
      };
    }
  }

  // Check if agents table exists and has correct structure
  static async checkTableStructure(): Promise<DebugResult> {
    try {
      // Try to query the agents table structure
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .limit(0);

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST116' || error.message.includes('relation "public.agents" does not exist')) {
          return {
            success: false,
            message: 'Agents table does not exist - may still be using chatbots table',
            details: { error: error.message, code: error.code }
          };
        }
        return {
          success: false,
          message: 'Error accessing agents table',
          details: { error: error.message, code: error.code }
        };
      }

      return {
        success: true,
        message: 'Agents table exists and is accessible'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Table structure check failed',
        details: { error: err instanceof Error ? err.message : String(err) }
      };
    }
  }

  // Check RLS policies
  static async checkRLSPolicies(): Promise<DebugResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'Cannot check RLS - user not authenticated'
        };
      }

      // Try to perform basic operations to test RLS
      const testData = {
        name: 'RLS Test Agent',
        model: 'gpt-4o',
        settings: { status: 'active' }
      };

      // Test INSERT permission
      const { data: insertData, error: insertError } = await supabase
        .from('agents')
        .insert(testData)
        .select()
        .single();

      if (insertError) {
        return {
          success: false,
          message: 'RLS INSERT policy failed',
          details: { error: insertError.message, code: insertError.code }
        };
      }

      // Test SELECT permission
      const { data: selectData, error: selectError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', insertData.id)
        .single();

      if (selectError) {
        // Clean up the test record
        await supabase.from('agents').delete().eq('id', insertData.id);
        return {
          success: false,
          message: 'RLS SELECT policy failed',
          details: { error: selectError.message, code: selectError.code }
        };
      }

      // Test UPDATE permission
      const { error: updateError } = await supabase
        .from('agents')
        .update({ name: 'RLS Test Agent Updated' })
        .eq('id', insertData.id);

      if (updateError) {
        // Clean up the test record
        await supabase.from('agents').delete().eq('id', insertData.id);
        return {
          success: false,
          message: 'RLS UPDATE policy failed',
          details: { error: updateError.message, code: updateError.code }
        };
      }

      // Test DELETE permission
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        return {
          success: false,
          message: 'RLS DELETE policy failed',
          details: { error: deleteError.message, code: deleteError.code }
        };
      }

      return {
        success: true,
        message: 'All RLS policies working correctly'
      };
    } catch (err) {
      return {
        success: false,
        message: 'RLS policy check failed',
        details: { error: err instanceof Error ? err.message : String(err) }
      };
    }
  }

  // Check storage bucket and permissions
  static async checkStorageBucket(): Promise<DebugResult> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        return {
          success: false,
          message: 'Failed to list storage buckets',
          details: { error: error.message }
        };
      }

      const agentAvatarsBucket = buckets?.find(bucket => bucket.name === 'agent-avatars');
      
      if (!agentAvatarsBucket) {
        return {
          success: false,
          message: 'agent-avatars storage bucket does not exist'
        };
      }

      return {
        success: true,
        message: 'Storage bucket exists',
        details: { bucket: agentAvatarsBucket }
      };
    } catch (err) {
      return {
        success: false,
        message: 'Storage bucket check failed',
        details: { error: err instanceof Error ? err.message : String(err) }
      };
    }
  }

  // Run comprehensive diagnostics
  static async runDiagnostics(): Promise<{
    auth: DebugResult;
    table: DebugResult;
    rls: DebugResult;
    storage: DebugResult;
    overall: boolean;
  }> {
    console.log('🔍 Running agent creation diagnostics...');

    const auth = await this.checkAuth();
    console.log(`Auth: ${auth.success ? '✅' : '❌'} ${auth.message}`);

    const table = await this.checkTableStructure();
    console.log(`Table: ${table.success ? '✅' : '❌'} ${table.message}`);

    const rls = auth.success && table.success ? await this.checkRLSPolicies() : {
      success: false,
      message: 'Skipped due to previous failures'
    };
    console.log(`RLS: ${rls.success ? '✅' : '❌'} ${rls.message}`);

    const storage = await this.checkStorageBucket();
    console.log(`Storage: ${storage.success ? '✅' : '❌'} ${storage.message}`);

    const overall = auth.success && table.success && rls.success && storage.success;
    console.log(`Overall: ${overall ? '✅ All systems operational' : '❌ Issues detected'}`);

    return { auth, table, rls, storage, overall };
  }

  // Test agent creation with detailed logging
  static async testAgentCreation(testData: {
    name: string;
    model: string;
    description?: string;
    base_prompt?: string;
  }): Promise<DebugResult> {
    try {
      console.log('🧪 Testing agent creation with data:', testData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated for test'
        };
      }

      const insertData = {
        user_id: user.id,
        name: testData.name,
        model: testData.model,
        description: testData.description,
        base_prompt: testData.base_prompt,
        settings: { status: 'active' }
      };

      console.log('📝 Inserting test agent...');
      const { data, error } = await supabase
        .from('agents')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Insert failed:', error);
        return {
          success: false,
          message: 'Agent creation failed',
          details: {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        };
      }

      console.log('✅ Test agent created successfully:', data.id);

      // Clean up test agent
      await supabase.from('agents').delete().eq('id', data.id);
      console.log('🧹 Test agent cleaned up');

      return {
        success: true,
        message: 'Agent creation test passed',
        details: { createdAgent: data }
      };
    } catch (err) {
      return {
        success: false,
        message: 'Agent creation test failed',
        details: { error: err instanceof Error ? err.message : String(err) }
      };
    }
  }
}

// Export convenience function for quick debugging
export async function debugAgentIssues() {
  return await AgentDebugger.runDiagnostics();
}
