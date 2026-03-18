import { useEffect, useMemo, useRef, useState } from "react";

const SIMPLECHAT_VERSION = "V9.2.4-DS3";
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const LOGO_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAsp0lEQVR4nOW9ebglVXXw/Vt7V9U5597bM03T3UAPQAMSQUARgaggokJQiUGiMU6gxiTqq4nR+H7R5DUxTxJRo2GIiaDRT8UJCaBBRCYhElBAQZmabmjoZmh6vNOpqr3X+8euOlWnzrm3B41Pvudbz3PvOVW1aw9r3muvvY9Yg6qCICiKAApI7YsIeK9Q3qd8RgWNa0H6rlWVJojAkNugZXWhE73+UCuvRX9l8PWy3mHPZoKAA/oHWPSjV68Jt6V47BFEtFe813hxMawPWsOTAFEfsjUgTYrhKyBKjzC1rlSdHLgVEBNwp0jRg9BEVYs2e9McdO9RwOYwOpWI6GufGYg60NGSUFqVb2KrxkNa4qcoXP9fG2D/Lak/LO+VAywYqJSAvkZrBUokiFYSoPXCqkF6RHsUn5n7hhAOEAyK710NSEtJjDq9tHobQAtObDJKj0N7T4dTp2yyKWn16x4rFZQvNQeiPQ3S7EGvswrUJEhVerd6N4UK+VXjUqgC6etYvV6lxkUNxMiAnqrkWrX4Q1GtcUn5TpO7G1zWJCP197SQ3gF8D9dLvbdVKuQjA4SgZMAGk+nQPpUPC1z4on6CJAiKWKkUf13XDnSv1EcD97X3ETpaEW+Y3u/r1y70dP/r9UbKAtVFT02WXS3fEgrVumtJGOhuTQ1WJlEbz81gvwbqLsvU7FnRdxOoWdPNdQ7rfWpPxPs7PDPZ61w05NXwrMFB/X/DrNcM46tblwEklqphCBTt1Mc80DEA0aKOSn/3pF9971nFcFLYi4pTyibq6gehkAComKLkmKLhXoWN0alWL5V6cDaQnjKtd6kfGX0tDFOn9X7V2qfxdQYt01+kFKji5jCZqDk05SjD9yHaoO419g2qPi6R0jcJNQqIEbTpWlYu2aBYDriDtcEM04n1eyIl5zS5uXQpGwa4xyZaG0sNETXrPGhrmsTpZxLp/RtmJ6ghcxbGqjFJH//W668RQER69qN8EEkNQ4oWXFbVLGjpnc4CwQeoS1DVdtWDYVxf58iyzwOE1xLJFdK1V5v2Kiu/mVq/eg3VkV8yTNHf5nyk9Or6OLEkfx0Rjc5Kb+z99qbXz0Jy6tpArOnJ81BOaPLATG7aoKGukaAhHfX+NJHSV0QrtO+CF4eC9H1WkjSTp9jXmT4pLUhfY8RK6hvjpLI5NbIN9L7Eh6m62Ovm4DAKji4pXCJ0mMop65JyUEOQPzD/AtQPKUNZyZ4jv/+dkmtqnz3Bkb4iVceLi1IjDGiB+uAZGGeJTWkQrXxWGn7Te3uAQjWDJ1qpLenXt6XX0i/mWqmIAXVSvVcH30OMFJz/q4NKXRUdGijQIEjNewnjL+73jbsymD0MlgImJUa1wk35ofQxazDCDLpqpUGsFEBVUanlRLShOyEETPzM4YAZ9E7dwPrdQL8Vw8J5liSBbqps3ubYFdlq3nzNntTuFx99Ato/9Ab9Kn1fi6IxDGO1qXR/n5qhiH592bQ4BS+Vxqsx5Hp3ZoQ6d/UZ092DJQtjXn1KmzNeKBy8wtNue7qp5d61wleudnznpmmmum6X9dT7XinNGpL6XN5Z7MfAJG9YW0MYvPg3IAHDjJ3UsK0DLLIL6KdQZdCKG7uL/pGW5XdfNsYfv144fOUkhhRfE/k4MuTa5od3tTj/813+45ap3a67OZRSxZYeV3k1+5iHic8MUHaa0guqey9N74QyTC2FJOkA92jPA4K+t0sj0PDjmySeHU2GU57b4c/elHDiUdMYmSJ3gJFafEYQqxhR4sgw2R3hWz+I+ftLJrlvXXcX2BiEMvpVEaCO/KY6KTEgPeeifHdAGQ2RFrGm184MgSud4Yo+agebUTbUX8VsgarZ3MtDD2jx3t/t8Dun5oy0Jsiy4DZgBIyhDBGICNgiuIUgYogTy4YtI1x0Gfzr18bZviPfjRYrMBXf176Vr9dUUnlzN6OuA+O3ItqchVYz40oU+zyfeoeKBuuKpV/Ph+d7ouuXzE9466tGOPcMx/JFk3Rzh0MCoo2g4gsiVEJmRIP9lzC1V1FIBN9qc9svWnzmX1OuuXYK53ZtH6pR9Y+ud7OMaNYMd+9hze1UAXzdrtQqLb5KtSLWp5oqddZQbTMisS/wVBNL2G3UtxPLOSeP8t6zYw4/YAeZy3Cl6hNT9FjxpfEygPjA9SVBDDij5BHkFjIB3xImaHPDzR0++0+T3PPTyd3qT+V49tuqnhcKNdVdSkGFhwEnpdQGWuG5MMIzI7bPDxJTREYL6tcjjTMQYHdcShBOPnKE95/T4sXPngKZIvcF0k2x2GNCZ6SYAaoIapUQz1WwgrdKZiGzkFshEyUzShZBZhRNIrZuH+XKr1kuu3SczU+ku+jVcJva58zWA4O1OVLl49Xfqxv34l7dDR00rtX3EqXa4+yGWPR0fb3bu+J94dBlCe87q8PZJ+aMtSdJnccXel4F1BhEfI8A2KCKvAGiQBgv4A2kEaRGSI0nt0LXKLmBzAqZKqkBJyCtmA2PjnD5pZ7rvzbB9MSeqaU+ApTorquWhj2dkcGF4fOA3mXNqtN3v7/KfpWzewpn3zkx5546wnmneg7cZ4LU+VBtgVA1FCql6IARxAJW0YIIGim5LZBvYMoqmRW64gtCQIYhEyU3QipCLp6uGIgN3rZ54M42V104zU+/P473fvZOD+IvfDYQVC7eVww8qMJ6C5hNG9AHDQ4feDbwddd+fWItrzm+w/teYXn2/pN4zfACWCouL/W7CRyuhX43VlArmCg8k5aSt2BSYFxh2kDXQipCJkKKkgrkxpKJJVNwoqQIjiBFmkSkbh4/u0H43j9t59G7dszafxqoqCMZtD/eQwOv5UXTBuyyxWZFjda1/3LGGk44qMP7zmhz2hETRNIlVzARiC36VXA9NujTEvliFCKDGEWskrSFaZNw94aER7co+61QFh+UM6kp0y6onBTIDORiyYjIxZCpkKshR/AKXhQvSm4jSGJ27hzjjsscP7zkSbZvmp51NKbhYAiVw1LyfBUTmhmHYmXmsA0w4BU1YdaVwgJWL0p4z2kjvPa5GQtaU2R41BK42hC4v2zHgFowxT21AlEQ6zhWTDvm9rUdPv4Vx/d+NM3EpGf+fMPpr2xz1puFBctTpjJfcL/giPBqSUVI1eDU4hG8Gpx4vJggDQh5FOFbY2ze0OaOf9vC3d98kumt2XC8FGgunQzTh2EJbjFBnZbOipHglQ4nQJ1MwxosDe0ABfqpXIc5Lcubnt/hj14EqxZOkasLXG4DksOSXNH78nuhitRQ6HzBWCVuGx7bPso/Xy1cfMUk23bmA+0tPSDmte8c5QVnOmilTKcGVUuukGFxYnsS4FTwgKrFGYtTgxNLZixZ3IFojCfu99zxucdZe9UmXCO+VA/sKVotApWqRWr0qKlw9Y1yJQH67MgwnV9vvObPzoT8E1aP8Fent/jNAyfwmpJLgfQCsVq49RSSgKme1b9HbWGnG+GyWyI++Y1pHtiwq9CCcORvdnjVH3VYfSykLiNNwRPj1JCrISuo7rwhx5CLRb3Bm4iMiMxacklwsSFljA23T3PX+b/gmTu3DLRmKnPaUzsljkqo46cvfUdKAjQRPhMBGvdLt7NpeH/32Dl8/EzD4niczDuIg6dC4eX0kC4VwntIL/6SWMiihOvua/Pxb2XccPcUw0k9HJKRiBPPmsPJ53aYc6Ann1byXPAYHBYvhtwXEiExXiMchkxinFicROQE+9Ftt5nY6bn7wz9l43c29rVTd0nLmbEUD+paox4+KqcO2iPALAMJQSYdcK1KAjTfPWXNGJe93jLHbCfTSsW4gqPFFp0qkV14QBTSYQ3YOOLuJ0b4xNWeb94yRTfffT+9CfOXJpx07kKOes0IyYjDdRX1CblaXIl0jckxOIlwGodPseREQV0RM9mxdMeVO9/+Q7b+ZHMfAepTrJ5qYchcobynlc2b0QtqTsSggeyaB1Ten9OKuPrcubxg8Xa6uIDo0rc39IyplAuhBTGIwFqIYsvGiQ6fu9lw0TVTPL1juAHcG1h+9BxO+MPFrDypDWrIU4v3EY6IVC3Om2CwJSKnkAIsTiCjRS4J3dEW2+98grvffA1uqrJBde6vQ/+kbVBdCyCRhOzO2ZKXqoprU7yixnqlZ/3GGF/+bcXnk2HCVMxQKRHdNLyFBCQtYYqEb9zV5vzvdrl3w+wu4N6CiQxrzljIMecuY96aDq7ryfOgfrxYnI/JScgL7vdqC3XUJrcxmbVMdyLWv+s7PPXdtb16pf5ZnxGXnzWObzJx5KHyWesz4vK6jvwGlZsUffmqiCSfZFoF9RrcTE+PEDY0FmjqIYpBTcz1D7Y4/1rHNffsaHbxVwo+99x3xWbW3biDw1+3jENet4xkURs3BeoinMSF7m+Ra4SXBC8RjphUg8RkkjDvFYf3EaAywc0s8p5X2lM9fflpwcOueT40VM9Mc4Aa55flW5Hl8AUGl1XTakPwfFQDwlUJRAFsbLnn6Q4X3KRcdvsUk9ne6/k9he62lLsuWs/D33uag960imUvXUo8kpClMZ42nhZeouA5YXHEOC2Msm/B6uXYxODSIaGLWhbFgC9TMHXdRY16+S1UVJFelkBZulBSQ6Z05a3EwKh14EEKi61Sy6UpbEHkYcK3ueDWiAtunOapIf78rwt2rJ3gzg/fw/rLH2PNO5/FnOfvj8siVBIgEMBLhJc4zKglItUEHR3DJBEuHRZNHdQS/d9rmkTBDIQTtJpeB7GZxdlvVC5OkNygziDOgjOIE4wPUWPrQWjx0etafOSq8V8p8od5zbNMZfpg653b+PF7b+OpG56i2+6QkpBLh9yMkJuR4JqS4EjwtHBqh9RSUyEz9CMwYr+1rbL4Sq6v5+mXXkz519eW9N9WwfgYXBxWQlyEuAicRXMBB7EXHtzc5tLbdm9BZCYowwDV918e8gnHI1+6j8wluKhDJh2yAumONk7aOFrkJHgXD2bxMQOP1tT3sAlZpPWSUj0p4/1Ny15V2PSbFPEW8RHGGNS7IsW8mjYbhHVPw47pPef8Zki3mRlalRs+4N2B6cd2kk5ANLeNaIxKgqot1JDBicGToJrMWLnWc0OHWGSFWiZ1YYQpb1Lj+F30vrmpLzReBHlcUYk4xAE+DitpOPK91DrDPAwYnKP8Uj6UCp4WKm1UIpQW3hgUS65CjiWnjVRoG9KfmqFsJmNJudWrnCbXCFD3fIZNjUvKVZZdG96RoM4EFUSOqkHFIN6g1qHBOhPJMP25u1CRe+jkcGjJ3QdF8NLG0wYilCQE6VTCTNnEeOnAEALUJ1pSapIBCSjvVT2L6hUMm8mV90zDFR0av/BxQDgGNC925khY21WHGEX9rgnQRG5lxKqtfLsDe0wEFXJtY80IiJA6i0qEx+CR4Ir6GOOTGdtrpjn2dWSICEd9E67GRKzqWOWi9pWpHheNR8HgGhCxoBliHDgJW6lyMLMQYNh0vQ8/e4DSeqldSUtVUPDaItcExeKMQTXEUHIgV4MjQfxwI9zrZc2zDAzf3++6lomqfWCDI+gj2ozIr08KivVNH1ZUBFAviPii1cJGzADNLpSh3oowe6ZUBhy3XYAqAcG0CCpI8Bo4P0NwJsL5FlZjZBg719oJCWIzWKbaZVTNlBqF6rdrM7iKMOUCfI2yPixj9XKRBMQaRB3qI8SD1DzfXUKxqrS3lrWpwnajwWIm3AYMXi2ZahErCh6Qo4X38ayVBvzM0umelhKimTab9WLZUrs/y2CU4AWJLzdnaJE+aIP+F49gEPXsCqNV2kslZ803kjkJ8w9fSDS3zeQT42y/7xk0H17v7tIvbE1q4WgDhHUDBIcNa8oSk2ubhBFmwkTdDsyg9mvbo3TQnPd2wvdM+syDaSQk9hJ0DKDGF2l5JmQ1hFVwVHcn5jN8plHC6leu4KDzDqWzch5qI9JJz1M/28mjX/w5W25YP/sCx6zNCs6H4JtREzwgDM7Y4AVpjKON1zZNxPSru7raGD68ErV9XpBCWLOUXrk+IlTLaaUjqjUxF0QtOA0r6s4FIhS6SETBwe64MbP59M968xoO/7PDydSQdx0+NWBbLDx+ASPPXc3T33+EDRfdytSDz+y6oSaIQbWN8+2gSosFe0dYOXPSRrWD93bAaFaOSGm3apYYBglRMHpUTujrO83DdXD6hntQVRN93pazYTs+DiQJnfRlzkFIqPplAgcLDp7HwX90KKkTXGrwvoWTFmiEmzaIiZh3+rNpP+9QNn/pv3jqq7eTb5/agxaEXBO8tlCF3FO4oDHO2DBJ8zHqoqHj6MN1T3sO8dxqG/tMoESDmmX8uFZzH8FrlrHufqlG4BJwLdAY8THiE0RjIA6fugdGuAFLX7QcXThKliU4bYeAGW3SIlzsfQITgpk/j0XvfSUrLn0381529KzHIfQPHNTbYGy1hfMtnE/INQ7qx1vUR6DD5wEFFgquLAxob49Zo6ECIq3Jex+xGi5n8/1B31rAR4gzGAWPR4swdlh7dGAEw97H/aMDO0x7A5LgJQ7BMU3wavFiQ8hDYiS3qIfo8APZ5/w/YPTau9n6z1cydd+GXbbhfULuE5SQNxSOMrBoHuOJApPpcAmgfreJtBmYIOqVm8nYNryfWbf3O8GpRX1xAoj1qHeICIIDb1C/9+u86Q5HSgy0UAlc6iVGsYEIJHhigm/RwqQRIjHxGS9k0QnHMfmNG9j5xSvIntg6QwuC0xa5j4PDQPAd1Id4kBQJTZrPLMUVGmcwwPWywq6d8t7BGUMsYt2eCmAwiMZ4DR1WjcEn4CPUJYhrBRHeS3jmjs2keYsuCTkdnGnhTEJuEpy0cJLgTPDV1Ud4H4Ww+BS40YXYt7+JOV+8kNGzfwvbioeO1fkIrwnOx/hev2PExWgepAxvhzoIZYBeS/Uz21Sg4F4zWEYGCkrDdtbTUfpKews+AqIQjFMbVpV8jOYR5FGxSr938MyPNrHjpqfIR8dIKRbQSfDSwps23rZRWgUCE5QElVawDblBJx358pXIX/4lo/98Ia0Tnt/ffw1jUB/hncXlUcE0LdTZEGzMTYh5De2hNv76Ydg7g/MAKq+nbmDrH8NAAJyg3qLG1vpRHsakqDfg9l4CfNex9i+vY+XoPFrPW4OfNogLakYlDmklRDiJUGK8xoVKaoUURLWQgcMwfdwLsUccy8gVV5J+/l/JHttQzFUSnLfgfWAWtYgaxAtGQ66p+DLNox8qV5ThxqAetdFSaxRPyhfra7jSV5P0voZF5b6d";

const BRAND_BLUE = "#19a8e8";
const HEADER_BG = "#171717";
const SURFACE = "#f3f4f6";
const TEXT = "#1f2937";
const MUTED = "#6b7280";

function formatTime(value) {
  try {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function createSessionId() {
  return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildProductUrl(product) {
  if (!product) return "#";
  if (product.url) return product.url;
  if (product.handle) return `https://www.cyberhome.app/products/${product.handle}`;
  return "#";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function sanitizeLeadText(value, max = 3000) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, max);
}

function resolveDetailLink(meta) {
  if (!meta) return null;
  return (
    meta.detailLink ||
    meta.link ||
    meta.url ||
    meta.policyLink ||
    meta.blogLink ||
    meta.articleLink ||
    null
  );
}

function resolveDetailLabel(meta) {
  if (!meta) return "View Details";
  return (
    meta.detailLinkLabel ||
    meta.linkLabel ||
    meta.policyLinkLabel ||
    meta.blogLinkLabel ||
    meta.articleLinkLabel ||
    "View Details"
  );
}

function LogoBadge({ size = 24, rounded = 8 }) {
  return (
    <img
      src={LOGO_URL}
      alt="CyberHome"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        background: "#0b0f17",
      }}
    />
  );
}

function Avatar({ role }) {
  if (role === "user") return null;
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: "#111827",
        border: "1px solid #1f2937",
        overflow: "hidden",
      }}
      title="CyberHome AI"
    >
      <LogoBadge size={22} rounded={999} />
    </div>
  );
}

function DetailLinkButton({ href, label }) {
  if (!href) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {label || "View Details"}
      </a>
    </div>
  );
}

function MoreLinkButton({ href, label }) {
  if (!href) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {label || "More products"}
      </a>
    </div>
  );
}

function ProductCard({ product }) {
  if (!product) return null;
  const title = product.title || "Product";
  const image = product.image || product.image_url || "";
  const model = product.model || product.product_id || "";
  const price = product.price ?? "";
  const url = buildProductUrl(product);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        display: "flex",
        gap: 16,
        background: "#fff",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 12,
          overflow: "hidden",
          background: "#f3f4f6",
          flexShrink: 0,
        }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35, marginBottom: 6 }}>{title}</div>
        {model ? <div style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>Model: {model}</div> : null}
        {price !== "" ? <div style={{ fontSize: 16, color: "#d97706", fontWeight: 700, marginBottom: 12 }}>{price}</div> : null}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
            display: "inline-block",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          View Details
        </a>
      </div>
    </div>
  );
}

function InlineLeadForm({
  submitting,
  submitted,
  error,
  form,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Name</div>
          <input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Your name"
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Email</div>
          <input
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="you@example.com"
            type="email"
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 6 }}>Message</div>
          <textarea
            value={form.note}
            onChange={(e) => onChange("note", e.target.value)}
            placeholder="Tell us what you need help with."
            rows={4}
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
          />
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}>
          {error}
        </div>
      ) : null}

      {submitted ? (
        <div style={{ marginTop: 14, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}>
          Thanks. Your message has been sent to our support team.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, marginTop: 16 }}>
        <label
          style={{
            height: 52,
            borderRadius: 16,
            border: "1px solid #d1d5db",
            background: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          📎
          <input type="file" hidden />
        </label>

        {onCancel ? (
          <button
            onClick={onCancel}
            type="button"
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#374151",
              height: 52,
              borderRadius: 16,
              cursor: "pointer",
              fontWeight: 700,
              padding: "0 14px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            Cancel
          </button>
        ) : <div />}

        <button
          onClick={onSubmit}
          disabled={submitting}
          type="button"
          style={{
            border: "none",
            background: submitting ? "#9ca3af" : BRAND_BLUE,
            color: "#fff",
            height: 52,
            width: 52,
            borderRadius: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 20,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

function InlineRatingPanel({ rating, feedback, onRatingChange, onFeedbackChange, onSubmit, onCancel }) {
  const options = ["😞", "😐", "🙂", "😊", "😍"];
  return (
    <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Please rate the conversation</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {options.map((emoji, idx) => {
          const active = rating === idx + 1;
          return (
            <button
              key={emoji}
              onClick={() => onRatingChange(idx + 1)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                border: active ? `2px solid ${BRAND_BLUE}` : "1px solid #d1d5db",
                background: "#fff",
                fontSize: 24,
                cursor: "pointer",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="Your feedback..."
        rows={4}
        style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, marginTop: 16 }}>
        <div />
        <button
          onClick={onCancel}
          type="button"
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            height: 52,
            borderRadius: 16,
            cursor: "pointer",
            fontWeight: 700,
            padding: "0 14px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          type="button"
          style={{
            border: "none",
            background: BRAND_BLUE,
            color: "#fff",
            height: 52,
            width: 52,
            borderRadius: 16,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 20,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export default function SimpleChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionId] = useState(() => createSessionId());
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadForm, setLeadForm] = useState({ name: "", email: "", note: "" });

  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");

  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);

  const bottomRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hasTriggeredIdleRef = useRef(false);

  // 监听父页面发来的 open 消息（当用户点击悬浮按钮时）
  useEffect(() => {
    const handleMessage = (event) => {
      // 可选择性添加来源检查： if (event.origin !== 'https://your-shopify-domain.com') return;
      const data = event.data || {};
      if (data.source === 'cyberhome-simplechat' && data.type === 'chat:open') {
        setIsOpen(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: "Welcome to CyberHome Support! How can we help you today?",
        createdAt: new Date().toISOString(),
        products: [],
        meta: {},
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showRatingPanel]);

  const transcriptForLead = useMemo(() => {
    return messages
      .filter((m) => m.type !== "lead_form" && m.type !== "rating_panel")
      .map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        products: Array.isArray(m.products) ? m.products : [],
        meta: m.meta || {},
      }));
  }, [messages]);

  function resetIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!idlePromptEnabled || hasTriggeredIdleRef.current || leadSubmitted) return;
    idleTimerRef.current = setTimeout(() => {
      if (!messages.some((m) => m.type === "lead_form" || m.type === "rating_panel")) {
        hasTriggeredIdleRef.current = true;
        injectRatingPanel("idle_timeout");
      }
    }, IDLE_TIMEOUT_MS);
  }

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [idlePromptEnabled, leadSubmitted, messages]);

  function touchActivity() {
    resetIdleTimer();
  }

  function removeExistingLeadForms() {
    setMessages((prev) => prev.filter((m) => m.type !== "lead_form"));
  }

  function removeExistingRatingPanels() {
    setMessages((prev) => prev.filter((m) => m.type !== "rating_panel"));
  }

  function injectLeadForm(reason, presetNote = "") {
    removeExistingLeadForms();
    removeExistingRatingPanels();
    setShowRatingPanel(false);
    setLeadError("");
    setLeadSubmitted(false);
    if (presetNote) {
      setLeadForm((prev) => ({ ...prev, note: prev.note || presetNote }));
    }
    const formMessage = {
      id: `lead_${Date.now()}`,
      type: "lead_form",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: { reason, showInlineLeadForm: true },
    };
    setMessages((prev) => [...prev, formMessage]);
  }

  function injectRatingPanel(reason = "idle_timeout") {
    removeExistingLeadForms();
    removeExistingRatingPanels();
    setShowRatingPanel(true);
    const ratingMessage = {
      id: `rating_${Date.now()}`,
      type: "rating_panel",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      products: [],
      meta: { reason, showInlineRatingPanel: true },
    };
    setMessages((prev) => [...prev, ratingMessage]);
  }

  function dismissLeadForm() {
    removeExistingLeadForms();
  }

  function dismissRatingPanel() {
    setShowRatingPanel(false);
    removeExistingRatingPanels();
  }

  function handleLeadFormChange(field, value) {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitLeadForm(reason = "manual") {
    const safeName = sanitizeLeadText(leadForm.name, 200);
    const safeEmail = normalizeEmail(leadForm.email);
    const safeNote = sanitizeLeadText(leadForm.note, 3000);

    if (!safeEmail || !isValidEmail(safeEmail)) {
      setLeadError("Please enter a valid email address.");
      return;
    }

    setLeadSubmitting(true);
    setLeadError("");

    try {
      const resp = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: safeName,
          email: safeEmail,
          note: safeNote,
          transcript: transcriptForLead,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_${reason}`,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.error || "Lead submission failed");

      setLeadSubmitted(true);
      setIdlePromptEnabled(false);
      removeExistingLeadForms();

      setMessages((prev) => [
        ...prev,
        {
          id: `lead_success_${Date.now()}`,
          role: "assistant",
          content: "Thank you. Your contact information has been received, and our colleague will follow up soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);
    } catch (error) {
      console.error("Lead submit error:", error);
      setLeadError("Sorry, we could not submit your message right now. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  async function submitRatingPanel() {
    try {
      await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: ratingValue || 5,
          feedback: ratingFeedback,
          source: `simplechat_${SIMPLECHAT_VERSION.toLowerCase().replace(/\./g, "_")}_idle`,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          submittedAt: new Date().toISOString(),
          transcript: transcriptForLead,
        }),
      });
    } catch (e) {
      console.error("rating submit error", e);
    } finally {
      dismissRatingPanel();
      setMessages((prev) => [
        ...prev,
        {
          id: `rating_success_${Date.now()}`,
          role: "assistant",
          content: "Thanks for your feedback.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: {},
        },
      ]);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    touchActivity();

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      products: [],
      meta: {},
    };

    const nextMessages = [...messages.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"), userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages.map((m) => ({ role: m.role, content: m.content, meta: m.meta || {} }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, sessionId }),
      });

      const data = await resp.json();

      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data?.response || "Sorry, I could not generate a response.",
        createdAt: new Date().toISOString(),
        products: Array.isArray(data?.products) ? data.products : [],
        meta: {
          ...(data?.meta || {}),
          showContactForm: data?.showContactForm ?? data?.meta?.showContactForm ?? false,
          handoffToHuman: data?.handoffToHuman ?? data?.meta?.handoffToHuman ?? false,
          fallbackTriggered: data?.fallbackTriggered ?? data?.meta?.fallbackTriggered ?? false,
        },
      };

      setMessages((prev) => [...prev.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"), aiMsg]);

      const aiText = String(data?.response || "");
      const shouldShowLeadForm =
        Boolean(data?.showContactForm) ||
        Boolean(data?.handoffToHuman) ||
        Boolean(data?.fallbackTriggered) ||
        Boolean(data?.meta?.showContactForm) ||
        Boolean(data?.meta?.handoffToHuman) ||
        Boolean(data?.meta?.fallbackTriggered);

      const looksLikeFallback =
        aiText.includes("As an AI assistant, I can't answer this question accurately right now.");

      const disallowedNoAnswerPatterns = [
        "we do not sell",
        "we don't sell",
        "i don't have information",
        "not available",
        "cannot find",
        "sorry, but",
        "sorry but",
      ];

      const lowerAiText = aiText.toLowerCase();
      const disallowedHit = disallowedNoAnswerPatterns.some((p) => lowerAiText.includes(p));

      if (shouldShowLeadForm || looksLikeFallback || disallowedHit) {
        const fallbackNote = text && !leadForm.note ? `Customer asked: ${text}` : "";
        injectLeadForm(data?.meta?.reason || "ai_handoff", fallbackNote);
      }
    } catch (error) {
      console.error("API error:", error);

      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "lead_form" && m.type !== "rating_panel"),
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            "As an AI assistant, I can't answer this question accurately right now. Please email support@cyberhome.app or fill in the feedback form below, and our colleague will get back to you soon.",
          createdAt: new Date().toISOString(),
          products: [],
          meta: { showContactForm: true, handoffToHuman: true, reason: "frontend_fetch_error" },
        },
      ]);

      injectLeadForm("frontend_fetch_error");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    touchActivity();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    touchActivity();
  }

  function handleEndChat() {
    touchActivity();
    injectRatingPanel("end_chat");
  }

  if (!mounted) return null;

  const hasOverlayPanel = messages.some((m) => m.type === "lead_form" || m.type === "rating_panel");

  return (
    <>
      {/* 悬浮按钮 - 仅在独立模式且窗口关闭时显示 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 2147483646,
            height: 56,
            border: "none",
            borderRadius: 999,
            background: BRAND_BLUE,
            boxShadow: "0 16px 38px rgba(0,0,0,.18)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 18px 0 12px",
            color: "white",
            fontWeight: 800,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <LogoBadge size={24} rounded={8} />
          <span style={{ fontSize: 16, lineHeight: 1 }}>CHAT</span>
        </button>
      )}

      {/* 聊天窗口 - 始终固定定位，由 isOpen 控制显示隐藏 */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            width: isExpanded ? "min(1100px, calc(100vw - 40px))" : "min(430px, calc(100vw - 24px))",
            height: isExpanded ? "min(920px, calc(100dvh - 40px))" : "min(820px, calc(100dvh - 24px))",
            maxWidth: "calc(100vw - 24px)",
            background: "#f9fafb",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            boxShadow: "0 24px 60px rgba(0,0,0,.24)",
            zIndex: 2147483645,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* 头部 - 固定 */}
          <div style={{ background: HEADER_BG, color: "#fff", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoBadge size={24} rounded={8} />
              <div style={{ fontWeight: 700, fontSize: 18 }}>CyberHome Support</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 22, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }}
              >
                {isExpanded ? "❐" : "▢"}
              </button>
              <button
                onClick={() => {
                  // 关闭自己
                  setIsOpen(false);
                  // 通知父页面隐藏 iframe 容器（如果在 iframe 内）
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                      { source: "cyberhome-simplechat", type: "chat:minimize" },
                      "*" // 生产环境可替换为您的 Shopify 域名
                    );
                  }
                }}
                style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 24, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }}
              >
                −
              </button>
            </div>
          </div>

          {/* 消息区域 - 可滚动 */}
          <div style={{ padding: 20, flex: 1, overflowY: "auto", background: "#ededed", minHeight: 0 }} onMouseMove={touchActivity} onClick={touchActivity}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              if (msg.type === "lead_form") {
                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineLeadForm
                          submitting={leadSubmitting}
                          submitted={leadSubmitted}
                          error={leadError}
                          form={leadForm}
                          onChange={handleLeadFormChange}
                          onSubmit={() => submitLeadForm(msg.meta?.reason || "manual")}
                          onCancel={dismissLeadForm}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "rating_panel") {
                return (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }}>
                      <Avatar role="assistant" />
                      <div style={{ maxWidth: "82%", width: "82%" }}>
                        <InlineRatingPanel
                          rating={ratingValue}
                          feedback={ratingFeedback}
                          onRatingChange={setRatingValue}
                          onFeedbackChange={setRatingFeedback}
                          onSubmit={submitRatingPanel}
                          onCancel={dismissRatingPanel}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              const detailLink = resolveDetailLink(msg.meta);
              const detailLabel = resolveDetailLabel(msg.meta);

              return (
                <div key={msg.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
                    {!isUser ? <Avatar role="assistant" /> : null}
                    <div style={{ maxWidth: "82%" }}>
                      <div
                        style={{
                          background: isUser ? "#2196f3" : "#fff",
                          color: isUser ? "#fff" : TEXT,
                          padding: "14px 16px",
                          borderRadius: 18,
                          fontSize: 16,
                          lineHeight: 1.5,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.content}
                      </div>

                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, paddingLeft: isUser ? 0 : 8, textAlign: isUser ? "right" : "left" }}>
                        {formatTime(msg.createdAt)}
                      </div>

                      {msg.role === "assistant" && detailLink ? <DetailLinkButton href={detailLink} label={detailLabel} /> : null}

                      {msg.role === "assistant" && Array.isArray(msg.products) && msg.products.length > 0 ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                            Products Available
                          </div>
                          {msg.products.map((product, idx) => (
                            <ProductCard key={product?.id || product?.handle || idx} product={product} />
                          ))}
                          <MoreLinkButton href={msg.meta?.moreLink} label={msg.meta?.moreLinkLabel || "More products"} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading ? <div style={{ color: MUTED, fontSize: 14 }}>Thinking...</div> : null}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入区域 - 固定，仅当无覆盖面板时显示 */}
          {!hasOverlayPanel && (
            <div style={{ padding: 16, background: SURFACE, borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                onFocus={touchActivity}
                placeholder="Type your message..."
                rows={1}
                style={{ width: "100%", resize: "vertical", minHeight: 52, borderRadius: 16, border: "1px solid #d1d5db", padding: "14px 16px", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 58px", gap: 10, alignItems: "stretch", marginTop: 10 }}>
                <label
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  📎
                  <input type="file" hidden onChange={() => {}} />
                </label>

                <button
                  onClick={handleEndChat}
                  disabled={loading}
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: loading ? "#9ca3af" : "#374151",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    padding: "0 14px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  End Chat
                </button>

                <button
                  onClick={sendMessage}
                  disabled={loading}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    border: "none",
                    background: loading ? "#d1d5db" : BRAND_BLUE,
                    color: "#fff",
                    fontSize: 18,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}