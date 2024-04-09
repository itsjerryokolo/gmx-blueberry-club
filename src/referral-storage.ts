import { log } from "@graphprotocol/graph-ts";
import { SetTraderReferralCode } from "../generated/ReferralStorage/ReferralStorage";
import { ReferralAccount } from "../generated/schema";
import { BLUEBERRY_REFERRAL_CODE } from "./common/const";

export function handleSetTraderReferralCode(
	event: SetTraderReferralCode
): void {
	if (event.params.code.toHexString() == BLUEBERRY_REFERRAL_CODE) {
		log.warning("Refferal Code Found---> Account: {}, Code: {}", [
			event.params.account.toHexString(),
			event.params.code.toHexString(),
		]);

		let referralAccount = new ReferralAccount(event.params.account);
		referralAccount.code = event.params.code;
		referralAccount.blockNumber = event.block.number;
		referralAccount.blockTimestamp = event.block.timestamp;
		referralAccount.transactionHash = event.transaction.hash;

		referralAccount.save();
	}
}
