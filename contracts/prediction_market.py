# Algorand Prediction Market Smart Contract
# Uses Algorand Python (formerly Puya) style logic for readability

from pyteal import *

def approval_program():
    # Global State Keys
    total_yes_pool = Bytes("yes_pool")
    total_no_pool = Bytes("no_pool")
    market_status = Bytes("status") # 0: Open, 1: Closed, 2: Resolved
    winning_outcome = Bytes("winner") # 1: Yes, 2: No
    oracle_address = Bytes("oracle")
    end_timestamp = Bytes("end_time")

    # Local State Keys (User Positions)
    user_yes_shares = Bytes("u_yes")
    user_no_shares = Bytes("u_no")

    # Handle Initialization
    # Args: [end_timestamp, oracle_address]
    handle_init = Seq([
        App.globalPut(total_yes_pool, Int(0)),
        App.globalPut(total_no_pool, Int(0)),
        App.globalPut(market_status, Int(0)),
        App.globalPut(oracle_address, Txn.application_args[1]),
        App.globalPut(end_timestamp, Btoi(Txn.application_args[0])),
        Return(Int(1))
    ])

    # Betting Logic
    # Args: ["place_bet", outcome (1 for YES, 0 for NO)]
    # Group: [Payment, AppCall]
    place_bet = Seq([
        # Security Checks
        Assert(App.globalGet(market_status) == Int(0)),
        Assert(Global.latest_timestamp() < App.globalGet(end_timestamp)),
        Assert(Global.group_size() == Int(2)),
        
        # Verify Payment
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() > Int(0)),
        
        # Update State based on outcome
        If(Btoi(Txn.application_args[1]) == Int(1))
        .Then(Seq([
            App.globalPut(total_yes_pool, App.globalGet(total_yes_pool) + Gtxn[0].amount()),
            App.localPut(Int(0), user_yes_shares, App.localGet(Int(0), user_yes_shares) + Gtxn[0].amount())
        ]))
        .Else(Seq([
            App.globalPut(total_no_pool, App.globalGet(total_no_pool) + Gtxn[0].amount()),
            App.localPut(Int(0), user_no_shares, App.localGet(Int(0), user_no_shares) + Gtxn[0].amount())
        ])),
        
        Return(Int(1))
    ])

    # Oracle Resolution
    # Args: ["resolve", winning_outcome (1 or 0)]
    resolve_market = Seq([
        Assert(Txn.sender() == App.globalGet(oracle_address)),
        Assert(App.globalGet(market_status) == Int(0)),
        App.globalPut(winning_outcome, Btoi(Txn.application_args[1])),
        App.globalPut(market_status, Int(2)), # Resolved
        Return(Int(1))
    ])

    # Claim Winnings
    # Logic: User_Payout = (User_Stake / Total_Winning_Pool_Stake) * Total_Contract_Balance
    # Example: (10 / 100) * 300 = 30 ALGO
    claim_winnings = Seq([
        Assert(App.globalGet(market_status) == Int(2)), # Must be Resolved
        
        # Calculate Total Pool (Yes + No)
        (total_pool := ScratchVar(TealType.uint64)).store(
            App.globalGet(total_yes_pool) + App.globalGet(total_no_pool)
        ),

        # Logic for YES winners
        If(And(App.globalGet(winning_outcome) == Int(1), App.localGet(Int(0), user_yes_shares) > Int(0)))
        .Then(Seq([
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: Txn.sender(),
                TxnField.amount: WideRatio(
                    [App.localGet(Int(0), user_yes_shares), total_pool.load()],
                    [App.globalGet(total_yes_pool)]
                )
            }),
            InnerTxnBuilder.Submit(),
            App.localPut(Int(0), user_yes_shares, Int(0))
        ])),

        # Logic for NO winners
        If(And(App.globalGet(winning_outcome) == Int(0), App.localGet(Int(0), user_no_shares) > Int(0)))
        .Then(Seq([
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: Txn.sender(),
                TxnField.amount: WideRatio(
                    [App.localGet(Int(0), user_no_shares), total_pool.load()],
                    [App.globalGet(total_no_pool)]
                )
            }),
            InnerTxnBuilder.Submit(),
            App.localPut(Int(0), user_no_shares, Int(0))
        ])),

        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), handle_init],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.application_args[0] == Bytes("place_bet"), place_bet],
        [Txn.application_args[0] == Bytes("resolve"), resolve_market],
        [Txn.application_args[0] == Bytes("claim"), claim_winnings]
    )

    return program

if __name__ == "__main__":
    print(compileTeal(approval_program(), Mode.Application, version=6))
