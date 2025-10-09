// Test file to check account names in processPurchase
import * as anchor from '@coral-xyz/anchor';
import CarsaIDL from './src/lib/carsa.json';

// This will help us see the exact account names expected
const program = new anchor.Program(CarsaIDL as any);

// Check processPurchase method structure
console.log('Process Purchase method:', program.methods.processPurchase);

// You can run this to see what account names are expected
// The error messages will tell us the correct account names
