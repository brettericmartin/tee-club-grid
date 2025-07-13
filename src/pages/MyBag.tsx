import MyBagSupabase from './MyBagSupabase';
// import MyBagTest from './MyBagTest';

// Simple wrapper to isolate the component from React Fast Refresh issues
export default function MyBag() {
  return <MyBagSupabase />;
}