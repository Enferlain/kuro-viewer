import { useContext } from "react";
import {
	SettingsContext,
	type SettingsContextValue,
} from "./SettingsContext.tsx";

export function useSettings(): SettingsContextValue {
	return useContext(SettingsContext);
}
