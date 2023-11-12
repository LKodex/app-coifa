### Balance
Method | Endpoint | Operation
:- | :- | :-
OK db506b1f-60e2-4dae-95f5-462fcf882510GET | /balance/:user_id | getUserBalance
POST | /balance/:user_id | postUserDeposit

### History
Method | Endpoint | Operation
:- | :- | :-
GET | /history/:user_id | getUserTransferenceHistory
GET | /history/:user_id/transference/:transference_id | getUserSpecificTransference

### Review
Method | Endpoint | Operation
:- | :- | :-
GET | /verify/:transference_id | getUnverifiedTransference
POST | /verify/:transference_id | postTransferenceVerification



Transference
=======================================================================
    id		            UUID, PRIMARY KEY
    recipient_id		UUID, FOREIGN KEY, NOT NULL
    amount      		INTEGER, NOT NULL
    date                DATE, NOT NULL
=======================================================================



Credit
=======================================================================
    transference_id     UUID, PRIMARY KEY, FOREIGN KEY
    reviewer_id		    UUID, FOREIGN KEY, NULLABLE
    amount_transfered	INTEGER, NULLABLE
    receipt             TEXT, NOT NULL
    status		    	"ACCEPTED" | "PENDING" | "REJECTED" | "PARTIAL"
=======================================================================

