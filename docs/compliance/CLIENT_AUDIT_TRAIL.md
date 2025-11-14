# Client Audit Trail

## DocType: Client Audit Log

Tracks every important compliance‑related change for a customer.

### Fields

| Field          | Type      | Description                                             |
|----------------|-----------|---------------------------------------------------------|
| customer       | Link      | Link to Customer                                       |
| action         | Select    | Create / Update / Delete                               |
| entity         | Data      | Field or table affected (e.g. tender_status, Filed Form row) |
| previous_value | Text      | Previous value (JSON or string)                        |
| new_value      | Text      | New value (JSON or string)                             |
| user           | Link      | ERPNext user performing the change                     |
| timestamp      | Datetime  | When it happened                                       |
| remarks        | Small Text| Optional notes                                         |
