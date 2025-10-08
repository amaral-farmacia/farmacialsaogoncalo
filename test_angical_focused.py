#!/usr/bin/env python3

import sys
sys.path.append('/app')
from backend_test import FarmaciaAPITester

def main():
    print("🔍 FOCUSED ANGICAL USER TESTING")
    print("=" * 50)
    
    tester = FarmaciaAPITester()
    
    # Login as admin first
    if not tester.test_login("admin", "admin123"):
        print("❌ Admin login failed")
        return 1
    
    # Run comprehensive angical user test
    success = tester.test_comprehensive_angical_user_system()
    
    if success:
        print("\n🎉 ALL ANGICAL USER TESTS PASSED!")
        return 0
    else:
        print("\n❌ ANGICAL USER TESTS FAILED!")
        return 1

if __name__ == "__main__":
    exit(main())