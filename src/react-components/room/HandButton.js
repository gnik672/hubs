import React, { useCallback, useEffect, useState } from "react";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as HandIcon } from "../icons/raise_hand.svg";
import { FormattedMessage, defineMessage, useIntl } from "react-intl";
import { ToolTip } from "@mozilla/lilypad-ui";
import { virtualAgent } from "../../bit-systems/agent-system";
import { roomPropertiesReader } from "../../utils/rooms-properties";
import { presentationSystem } from "../../bit-systems/presentation-system";

const HandTooltipDescription = defineMessage({
  id: "hand-tooltip.description",
  defaultMessage: "Ask Question"
});

export function HandButton() {
  if (roomPropertiesReader.AllowPresentation) {
    const [active, setActive] = useState(false);
    const [disabled, setDisabled] = useState(presentationSystem.presenterState);

    useEffect(() => {
      if (presentationSystem.presenterState) setDisabled(true);
      else setDisabled(false);

      console.log(`disabled hook`);
    }, [presentationSystem.presenterState]);

    useEffect(() => {
      setActive(presentationSystem.raisedHand);
      console.log(`raised hook`);
    }, [presentationSystem.raisedHand]);

    const intl = useIntl();
    const description = intl.formatMessage(HandTooltipDescription);

    // const clickCallback = () => {
    //   presentationSystem.ToggleHand();
    // };

    const clickCallback = useCallback(() => {
      presentationSystem.ToggleHand();
    }, presentationSystem);

    return (
      <ToolTip description={description}>
        <ToolbarButton
          onClick={clickCallback}
          selected={active}
          disabled={disabled}
          icon={<HandIcon />}
          preset="accent5"
          label={<FormattedMessage id="hand-toolbar-button" defaultMessage="Ask" />}
        />
      </ToolTip>
    );
  }

  return null;
}
