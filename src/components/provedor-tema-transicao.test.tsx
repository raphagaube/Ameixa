// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProvedorTema, useTema } from "./provedor-tema";
function Controle(){ const {modo,alternarModo}=useTema(); return <button onClick={alternarModo}>{modo}</button>; }
beforeEach(()=>{localStorage.clear();localStorage.setItem("ameixa:modo","light"); vi.stubGlobal("matchMedia",vi.fn(()=>({matches:false})));});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it("alterna rapidamente sem ignorar a segunda escolha e persiste o resultado",()=>{
 vi.useFakeTimers();render(<ProvedorTema><Controle/></ProvedorTema>);
 fireEvent.click(screen.getByRole("button",{name:"light"}));
 expect(document.documentElement.dataset.mode).toBe("dark");
 fireEvent.click(screen.getByRole("button",{name:"dark"}));
 expect(document.documentElement.dataset.mode).toBe("light");
 expect(localStorage.getItem("ameixa:modo")).toBe("light");
 act(()=>{vi.advanceTimersByTime(451);});
 expect(document.documentElement.classList.contains("tema-em-troca")).toBe(false);
});
it("respeita a preferência por reduzir movimento",()=>{
 vi.stubGlobal("matchMedia",vi.fn((q:string)=>({matches:q.includes("reduced-motion")})));
 render(<ProvedorTema><Controle/></ProvedorTema>);
 fireEvent.click(screen.getByRole("button",{name:"light"}));
 expect(document.documentElement.dataset.mode).toBe("dark");
 expect(document.documentElement.classList.contains("tema-em-troca")).toBe(false);
});
it("limpa a transição ao desmontar, preservando a escolha salva",()=>{
 vi.useFakeTimers();
 const tela=render(<ProvedorTema><Controle/></ProvedorTema>);
 fireEvent.click(screen.getByRole("button",{name:"light"}));
 expect(localStorage.getItem("ameixa:modo")).toBe("dark");
 tela.unmount();
 expect(document.documentElement.classList.contains("tema-em-troca")).toBe(false);
 act(()=>{vi.advanceTimersByTime(1000);});
 expect(document.documentElement.classList.contains("tema-em-troca")).toBe(false);
 expect(localStorage.getItem("ameixa:modo")).toBe("dark");
});
