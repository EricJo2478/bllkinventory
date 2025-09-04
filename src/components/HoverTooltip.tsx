import { OverlayTrigger, Tooltip } from "react-bootstrap";

interface Props {
  children: any;
  text?: any;
  placement?: "top" | "left" | "bottom" | "right";
}
export default function HoverTooltip({
  children,
  text,
  placement = "top",
}: Props) {
  const getTooltip = (props: any) => {
    if (text) {
      return <Tooltip {...props}>{text}</Tooltip>;
    }
    return <span />;
  };
  return (
    <OverlayTrigger
      placement={placement}
      delay={{ show: 250, hide: 400 }}
      overlay={getTooltip}
    >
      {children}
    </OverlayTrigger>
  );
}
