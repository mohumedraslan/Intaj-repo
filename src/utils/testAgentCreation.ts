// Test script for agent creation functionality
// Run this to verify all fixes are working properly

import { AgentDebugger } from './debugAgent';
import { createAgent } from '@/app/dashboard/chatbots/actions';

export async function runAgentCreationTests() {
  console.log('🚀 Starting comprehensive agent creation tests...\n');

  // Step 1: Run diagnostics
  console.log('=== STEP 1: SYSTEM DIAGNOSTICS ===');
  const diagnostics = await AgentDebugger.runDiagnostics();
  
  if (!diagnostics.overall) {
    console.log('\n❌ System diagnostics failed. Please run the database migration first.');
    console.log('Run: npx supabase db push');
    return false;
  }

  // Step 2: Test basic agent creation
  console.log('\n=== STEP 2: BASIC AGENT CREATION TEST ===');
  const basicTest = await AgentDebugger.testAgentCreation({
    name: 'Test Agent Basic',
    model: 'gpt-4o'
  });

  if (!basicTest.success) {
    console.log('❌ Basic agent creation test failed:', basicTest.message);
    return false;
  }

  // Step 3: Test agent creation with all fields
  console.log('\n=== STEP 3: FULL AGENT CREATION TEST ===');
  const fullTest = await AgentDebugger.testAgentCreation({
    name: 'Test Agent Full',
    model: 'claude-3-sonnet',
    description: 'A comprehensive test agent with all fields',
    base_prompt: 'You are a helpful test assistant.'
  });

  if (!fullTest.success) {
    console.log('❌ Full agent creation test failed:', fullTest.message);
    return false;
  }

  // Step 4: Test createAgent function directly
  console.log('\n=== STEP 4: DIRECT FUNCTION TEST ===');
  try {
    const testAgent = await createAgent({
      name: 'Direct Function Test',
      model: 'gpt-4o',
      description: 'Testing createAgent function directly',
      base_prompt: 'You are a test agent.',
      settings: { status: 'active' }
    });

    console.log('✅ Direct function test passed:', testAgent.id);

    // Clean up
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.from('agents').delete().eq('id', testAgent.id);
    console.log('🧹 Test agent cleaned up');

  } catch (error) {
    console.log('❌ Direct function test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }

  // Step 5: Test validation errors
  console.log('\n=== STEP 5: VALIDATION TESTS ===');
  
  // Test empty name
  try {
    await createAgent({
      name: '',
      model: 'gpt-4o',
      settings: { status: 'active' }
    });
    console.log('❌ Empty name validation failed - should have thrown error');
    return false;
  } catch (error) {
    console.log('✅ Empty name validation working:', error instanceof Error ? error.message : String(error));
  }

  // Test invalid model
  try {
    await createAgent({
      name: 'Test Agent',
      model: 'invalid-model',
      settings: { status: 'active' }
    });
    console.log('❌ Invalid model validation failed - should have thrown error');
    return false;
  } catch (error) {
    console.log('✅ Invalid model validation working:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 ALL TESTS PASSED! Agent creation is working properly.');
  return true;
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
  (window as any).testAgentCreation = runAgentCreationTests;
}
