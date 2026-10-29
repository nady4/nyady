"use client";
import { ReactNode } from "react";
import "@/styles/FormContainer.scss";

type FormContainerProps = {
  title: string;
  children: ReactNode;
};

export default function FormContainer({ title, children }: FormContainerProps) {
  return (
    <div className="form-container">
      <h1 className="title">{title}</h1>
      {children}
    </div>
  );
}