
import React from "react";
import { render } from "@testing-library/react";

import RangeSlider from "./RangeSlider";
import { RangeSliderProps } from "./RangeSlider.types";

describe("Test Component", () => {
  let props: RangeSliderProps;

  beforeEach(() => {
    props = {
      foo: "bar"
    };
  });

  const renderComponent = () => render(<RangeSlider {...props} />);

  it("should render foo text correctly", () => {
    props.foo = "test foo text";
    const { getByTestId } = renderComponent();

    const component = getByTestId("RangeSlider");

    expect(component).toHaveTextContent("test foo text");
  });
});
