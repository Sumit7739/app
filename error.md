➜  frontend git:(main) ✗ npm install
npm run tauri build

up to date, audited 510 packages in 949ms

141 packages are looking for funding
  run `npm fund` for details

5 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

> prospine-mobile@1.0.0 tauri
> tauri build

     Running beforeBuildCommand `npm run build`

> prospine-mobile@1.0.0 build
> tsc && vite build

src/screens/Admin/Issues/IssueManagementScreen.tsx:5:18 - error TS6133: 'ChevronRight' is declared but its value is never read.

5     AlertCircle, ChevronRight, X, Send, User, Calendar
                   ~~~~~~~~~~~~

src/screens/Admin/Issues/IssueManagementScreen.tsx:5:41 - error TS6133: 'User' is declared but its value is never read.

5     AlertCircle, ChevronRight, X, Send, User, Calendar
                                          ~~~~

src/screens/Admin/Issues/IssueManagementScreen.tsx:5:47 - error TS6133: 'Calendar' is declared but its value is never read.

5     AlertCircle, ChevronRight, X, Send, User, Calendar
                                                ~~~~~~~~

src/screens/Admin/Patients/PatientsScreen.tsx:7:5 - error TS6133: 'ChevronRight' is declared but its value is never read.

7     ChevronRight,
      ~~~~~~~~~~~~

src/screens/Admin/Patients/PatientsScreen.tsx:8:5 - error TS6133: 'TrendingUp' is declared but its value is never read.

8     TrendingUp,
      ~~~~~~~~~~

src/screens/Admin/Patients/PatientsScreen.tsx:9:5 - error TS6133: 'Wallet' is declared but its value is never read.

9     Wallet,
      ~~~~~~

src/screens/Expenses/ExpensesScreen.tsx:3:33 - error TS6133: 'User' is declared but its value is never read.

3   ArrowLeft, Calendar, Plus, X, User, Hash, AlignLeft,
                                  ~~~~

src/screens/Expenses/ExpensesScreen.tsx:3:39 - error TS6133: 'Hash' is declared but its value is never read.

3   ArrowLeft, Calendar, Plus, X, User, Hash, AlignLeft,
                                        ~~~~

src/screens/Expenses/ExpensesScreen.tsx:4:31 - error TS6133: 'Search' is declared but its value is never read.

4   Wallet, CheckCircle, Clock, Search, AlertCircle
                                ~~~~~~

src/screens/Expenses/ExpensesScreen.tsx:4:39 - error TS6133: 'AlertCircle' is declared but its value is never read.

4   Wallet, CheckCircle, Clock, Search, AlertCircle
                                        ~~~~~~~~~~~

src/screens/Expenses/ExpensesScreen.tsx:137:60 - error TS2554: Expected 1 arguments, but got 2.

137         str += handle_tens(num.toString().padStart(2,'0'), "");
                                                               ~~


Found 11 errors in 3 files.

Errors  Files
     3  src/screens/Admin/Issues/IssueManagementScreen.tsx:5
     3  src/screens/Admin/Patients/PatientsScreen.tsx:7
     5  src/screens/Expenses/ExpensesScreen.tsx:3
       Error beforeBuildCommand `npm run build` failed with exit code 2
